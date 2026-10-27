import { test, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Resource } from '../src/models/Resource.js';
import { Vote } from '../src/models/Vote.js';
import { Report } from '../src/models/Report.js';
import { Comment } from '../src/models/Comment.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { calculateUserReputation } from '../src/services/reputationService.js';
import { config } from '../src/config/env.js';

let server;
let baseUrl;
let studentCookie = '';
let studentUser;
let moderatorCookie = '';
let moderatorUser;
let testResourceId;

// Test valid 1-page PDF buffer (%PDF-1.4 header)
const samplePdfBuffer = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'
);

before(async () => {
  await connectDB();
  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;

  // Clean test artifacts with prefix test_
  if (mongoose.connection.readyState === 1) {
    await User.deleteMany({ email: /@testcampusatlas\.edu$/ });
  }
});

after(async () => {
  if (mongoose.connection.readyState === 1) {
    // Cleanup test records
    await User.deleteMany({ email: /@testcampusatlas\.edu$/ });
    if (testResourceId) {
      await Resource.findByIdAndDelete(testResourceId);
      await Vote.deleteMany({ resourceId: testResourceId });
      await Comment.deleteMany({ resourceId: testResourceId });
      await Report.deleteMany({ resourceId: testResourceId });
    }
  }
  if (server) server.close();
  await disconnectDB();
});

test('F1: User Registration, Role assignment & Password Hashing', async (t) => {
  if (mongoose.connection.readyState !== 1) {
    t.skip('Configured MongoDB is unreachable (degraded mode)');
    return;
  }
  // 1. Register normal student
  const studentRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice Student',
      email: 'alice@testcampusatlas.edu',
      password: 'studentPassword123',
      role: 'moderator', // Attempt to self-select role should be strictly ignored
    }),
  });

  assert.strictEqual(studentRes.status, 201);
  const studentData = await studentRes.json();
  assert.strictEqual(studentData.success, true);
  assert.strictEqual(studentData.user.role, 'student', 'Server must ignore client self-selected role');
  assert.strictEqual(studentData.user.passwordHash, undefined, 'Never expose passwordHash');

  studentUser = studentData.user;
  const studentSetCookie = studentRes.headers.get('set-cookie');
  assert.ok(studentSetCookie && studentSetCookie.includes('ca_auth_token'));
  studentCookie = studentSetCookie.split(';')[0];

  // Verify password hash in database
  const dbUser = await User.findById(studentUser._id).select('+passwordHash');
  assert.ok(dbUser.passwordHash.startsWith('$2'));
  const isMatch = await dbUser.comparePassword('studentPassword123');
  assert.strictEqual(isMatch, true);

  // 2. Prevent duplicate email registration
  const dupRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Duplicate Alice',
      email: 'alice@testcampusatlas.edu',
      password: 'password123',
    }),
  });
  assert.strictEqual(dupRes.status, 409);
  const dupData = await dupRes.json();
  assert.strictEqual(dupData.error.code, 'DUPLICATE_KEY');

  // 3. Register moderator via ADMIN_EMAILS configuration
  config.ADMIN_EMAILS.push('moderator@testcampusatlas.edu');
  const modRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Prof. Xavier Moderator',
      email: 'moderator@testcampusatlas.edu',
      password: 'moderatorPassword123',
    }),
  });

  assert.strictEqual(modRes.status, 201);
  const modData = await modRes.json();
  assert.strictEqual(modData.user.role, 'moderator');
  moderatorUser = modData.user;
  moderatorCookie = modRes.headers.get('set-cookie').split(';')[0];
});

test('F1: Authentication Login & Me Endpoints', async (t) => {
  if (mongoose.connection.readyState !== 1) {
    t.skip('Configured MongoDB is unreachable (degraded mode)');
    return;
  }
  // Test invalid login
  const badLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'alice@testcampusatlas.edu',
      password: 'wrongPassword',
    }),
  });
  assert.strictEqual(badLogin.status, 401);

  // Test successful login
  const goodLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'alice@testcampusatlas.edu',
      password: 'studentPassword123',
    }),
  });
  assert.strictEqual(goodLogin.status, 200);

  // Test /api/auth/me with cookie
  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Cookie: studentCookie },
  });
  assert.strictEqual(meRes.status, 200);
  const meData = await meRes.json();
  assert.strictEqual(meData.user.email, 'alice@testcampusatlas.edu');
  assert.ok(typeof meData.user.reputation.score === 'number');

  // Test /api/auth/me without auth
  const unauthMe = await fetch(`${baseUrl}/api/auth/me`);
  assert.strictEqual(unauthMe.status, 401);
});

test('F2: PDF Upload validation (size, MIME, and magic bytes signature)', async (t) => {
  if (mongoose.connection.readyState !== 1) {
    t.skip('Configured MongoDB is unreachable (degraded mode)');
    return;
  }
  // 1. Rejection of fake PDF (invalid magic bytes header)
  const fakePdf = Buffer.from('This is a text file renamed to fake.pdf');
  const fakeFormData = new FormData();
  fakeFormData.append('file', new Blob([fakePdf], { type: 'application/pdf' }), 'fake.pdf');
  fakeFormData.append('title', 'Fake Document');
  fakeFormData.append('courseCode', 'CS101');
  fakeFormData.append('courseName', 'Introduction to CS');
  fakeFormData.append('subject', 'Computer Science');
  fakeFormData.append('semester', '1');
  fakeFormData.append('academicYear', '2024-2025');
  fakeFormData.append('resourceType', 'lecture-notes');

  const fakeRes = await fetch(`${baseUrl}/api/resources`, {
    method: 'POST',
    headers: { Cookie: studentCookie },
    body: fakeFormData,
  });
  assert.strictEqual(fakeRes.status, 422);
  const fakeData = await fakeRes.json();
  assert.strictEqual(fakeData.error.code, 'INVALID_PDF_SIGNATURE');

  // 2. Valid PDF upload
  const validFormData = new FormData();
  validFormData.append('file', new Blob([samplePdfBuffer], { type: 'application/pdf' }), 'ds_notes.pdf');
  validFormData.append('title', 'Data Structures Lecture Notes');
  validFormData.append('description', 'Comprehensive lecture notes covering Binary Search Trees and Graphs');
  validFormData.append('courseCode', 'CS201');
  validFormData.append('courseName', 'Data Structures & Algorithms');
  validFormData.append('subject', 'Computer Science');
  validFormData.append('semester', '3');
  validFormData.append('academicYear', '2024-2025');
  validFormData.append('resourceType', 'lecture-notes');

  const uploadRes = await fetch(`${baseUrl}/api/resources`, {
    method: 'POST',
    headers: { Cookie: studentCookie },
    body: validFormData,
  });

  assert.strictEqual(uploadRes.status, 201);
  const uploadData = await uploadRes.json();
  assert.strictEqual(uploadData.success, true);
  assert.strictEqual(uploadData.resource.title, 'Data Structures Lecture Notes');
  assert.strictEqual(uploadData.resource.ingestionStatus, 'queued');
  assert.strictEqual(uploadData.resource.verificationStatus, 'unverified');
  assert.strictEqual(uploadData.resource.fileData, undefined, 'fileData must never be returned in JSON response');

  testResourceId = uploadData.resource._id;
});

test('F2: Resource Listing, Search, Detail, and PDF Streaming', async (t) => {
  if (mongoose.connection.readyState !== 1) {
    t.skip('Configured MongoDB is unreachable (degraded mode)');
    return;
  }
  // 1. List query with search & filter
  const listRes = await fetch(`${baseUrl}/api/resources?search=structures&semester=3`);
  assert.strictEqual(listRes.status, 200);
  const listData = await listRes.json();
  assert.strictEqual(listData.success, true);
  assert.ok(listData.resources.length >= 1);
  assert.strictEqual(listData.resources[0].fileData, undefined);

  // 2. Resource detail
  const detailRes = await fetch(`${baseUrl}/api/resources/${testResourceId}`, {
    headers: { Cookie: studentCookie },
  });
  assert.strictEqual(detailRes.status, 200);
  const detailData = await detailRes.json();
  assert.strictEqual(detailData.resource.courseCode, 'CS201');
  assert.strictEqual(detailData.resource.userVote, 0);

  // 3. PDF preview streaming
  const previewRes = await fetch(`${baseUrl}/api/resources/${testResourceId}/preview`);
  assert.strictEqual(previewRes.status, 200);
  assert.strictEqual(previewRes.headers.get('content-type'), 'application/pdf');
  assert.ok(previewRes.headers.get('content-disposition').includes('inline'));
  const pdfBytes = Buffer.from(await previewRes.arrayBuffer());
  assert.ok(pdfBytes.toString().startsWith('%PDF-'));
});

test('F5: Vote Uniqueness and Score Recalculation', async (t) => {
  if (mongoose.connection.readyState !== 1) {
    t.skip('Configured MongoDB is unreachable (degraded mode)');
    return;
  }
  // 1. Alice upvotes (value: 1)
  const upvoteRes = await fetch(`${baseUrl}/api/resources/${testResourceId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
    body: JSON.stringify({ value: 1 }),
  });
  assert.strictEqual(upvoteRes.status, 200);
  const upvoteData = await upvoteRes.json();
  assert.strictEqual(upvoteData.userVote, 1);
  assert.strictEqual(upvoteData.voteScore, 1);
  assert.strictEqual(upvoteData.upvoteCount, 1);

  // 2. Alice switches to downvote (value: -1) -> Replaces vote without duplicates
  const downvoteRes = await fetch(`${baseUrl}/api/resources/${testResourceId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
    body: JSON.stringify({ value: -1 }),
  });
  assert.strictEqual(downvoteRes.status, 200);
  const downvoteData = await downvoteRes.json();
  assert.strictEqual(downvoteData.userVote, -1);
  assert.strictEqual(downvoteData.voteScore, -1);
  assert.strictEqual(downvoteData.upvoteCount, 0);
  assert.strictEqual(downvoteData.downvoteCount, 1);

  // Verify database has exactly 1 vote record for this user/resource
  const votesCount = await Vote.countDocuments({
    userId: studentUser._id,
    resourceId: testResourceId,
  });
  assert.strictEqual(votesCount, 1, 'Only 1 vote record per user per resource allowed');

  // 3. Moderator also upvotes (value: 1) -> Score = 0 (-1 + 1)
  const modVoteRes = await fetch(`${baseUrl}/api/resources/${testResourceId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: moderatorCookie },
    body: JSON.stringify({ value: 1 }),
  });
  assert.strictEqual(modVoteRes.status, 200);
  const modVoteData = await modVoteRes.json();
  assert.strictEqual(modVoteData.voteScore, 0);
});

test('F5: Resource Comments, Reports & Duplicate-Open-Report Protection', async (t) => {
  if (mongoose.connection.readyState !== 1) {
    t.skip('Configured MongoDB is unreachable (degraded mode)');
    return;
  }
  // 1. Add comment
  const commentRes = await fetch(`${baseUrl}/api/resources/${testResourceId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
    body: JSON.stringify({ body: 'Excellent syllabus coverage for semester 3!' }),
  });
  assert.strictEqual(commentRes.status, 201);
  const commentData = await commentRes.json();
  assert.strictEqual(commentData.comment.body, 'Excellent syllabus coverage for semester 3!');

  // 2. Submit report
  const reportRes = await fetch(`${baseUrl}/api/resources/${testResourceId}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
    body: JSON.stringify({
      reason: 'poor_quality',
      details: 'Pages 3 and 4 have slightly blurry scans.',
    }),
  });
  assert.strictEqual(reportRes.status, 201);

  // 3. Attempt duplicate open report by same user
  const dupReportRes = await fetch(`${baseUrl}/api/resources/${testResourceId}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
    body: JSON.stringify({
      reason: 'spam_or_abuse',
      details: 'Second complaint.',
    }),
  });
  assert.strictEqual(dupReportRes.status, 409);
  const dupReportData = await dupReportRes.json();
  assert.strictEqual(dupReportData.error.code, 'DUPLICATE_OPEN_REPORT');
});

test('F5: Moderator Actions, Verification & Reputation Calculation', async (t) => {
  if (mongoose.connection.readyState !== 1) {
    t.skip('Configured MongoDB is unreachable (degraded mode)');
    return;
  }
  // 1. Non-moderator cannot access moderator queue
  const unauthModRes = await fetch(`${baseUrl}/api/moderator/queue`, {
    headers: { Cookie: studentCookie },
  });
  assert.strictEqual(unauthModRes.status, 403);

  // 2. Moderator views queue
  const modQueueRes = await fetch(`${baseUrl}/api/moderator/queue`, {
    headers: { Cookie: moderatorCookie },
  });
  assert.strictEqual(modQueueRes.status, 200);
  const queueData = await modQueueRes.json();
  assert.ok(queueData.reports.length >= 1);

  // 3. Moderator marks resource Verified
  const verifyRes = await fetch(`${baseUrl}/api/moderator/resources/${testResourceId}/verify`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: moderatorCookie },
    body: JSON.stringify({ note: 'Verified by Academic Review Board' }),
  });
  assert.strictEqual(verifyRes.status, 200);
  const verifyData = await verifyRes.json();
  assert.strictEqual(verifyData.resource.verificationStatus, 'verified');

  // 4. Verify Contributor Reputation calculation from persisted events
  const rep = await calculateUserReputation(studentUser._id);
  assert.strictEqual(rep.verifiedUploads, 1);
  // Formula: upvotes * 2 - downvotes * 1 + verified * 10 - upheld * 5
  // Current: 0 upvotes received on this doc (-1 from alice is self, wait: alice is uploader, upvote from mod is +1, downvote from alice is -1)
  assert.ok(rep.score >= 10, 'Reputation reflects verified upload');
});
