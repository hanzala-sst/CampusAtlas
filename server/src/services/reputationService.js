import { Resource } from '../models/Resource.js';
import { Report } from '../models/Report.js';

export async function calculateUserReputation(userId) {
  // Aggregate stats across all resources uploaded by this user
  const userResources = await Resource.find({ uploadedBy: userId }).select(
    '_id upvoteCount downvoteCount verificationStatus'
  );

  const totalUploads = userResources.length;
  let verifiedUploads = 0;
  let upvotesReceived = 0;
  let downvotesReceived = 0;
  const resourceIds = [];

  for (const res of userResources) {
    resourceIds.push(res._id);
    if (res.verificationStatus === 'verified') {
      verifiedUploads++;
    }
    upvotesReceived += res.upvoteCount || 0;
    downvotesReceived += res.downvoteCount || 0;
  }

  // Count upheld reports against user's resources
  let upheldReports = 0;
  if (resourceIds.length > 0) {
    upheldReports = await Report.countDocuments({
      resourceId: { $in: resourceIds },
      status: 'resolved',
    });
  }

  // Formula: Helpful votes (+2), Downvotes (-1), Moderator Verification (+10), Upheld Infractions (-5)
  // Raw upload volume alone gives 0 points to prevent spam gaming.
  const rawScore =
    upvotesReceived * 2 -
    downvotesReceived * 1 +
    verifiedUploads * 10 -
    upheldReports * 5;

  const score = Math.max(0, rawScore);

  return {
    score,
    totalUploads,
    verifiedUploads,
    upvotesReceived,
    downvotesReceived,
    netVotes: upvotesReceived - downvotesReceived,
    upheldReports,
  };
}
