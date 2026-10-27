import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Clock, 
  X,
  FileCheck
} from 'lucide-react';

export default function UploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [subject, setSubject] = useState('');
  const [semester, setSemester] = useState(1);
  const [academicYear, setAcademicYear] = useState('2024-2025');
  const [resourceType, setResourceType] = useState('lecture-notes');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (selectedFile) => {
    setError(null);
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF documents (.pdf) are allowed.');
      return;
    }

    if (selectedFile.size > 8 * 1024 * 1024) {
      setError('File size exceeds the 8 MiB upload limit.');
      return;
    }

    setFile(selectedFile);
    // Autofill title if empty
    if (!title) {
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError('Please select a PDF file to upload.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('courseCode', courseCode.trim().toUpperCase());
      formData.append('courseName', courseName.trim());
      formData.append('subject', subject.trim());
      formData.append('semester', semester.toString());
      formData.append('academicYear', academicYear.trim());
      formData.append('resourceType', resourceType);

      const res = await api.resources.upload(formData);
      if (res?.success && res?.resource?._id) {
        navigate(`/resources/${res.resource._id}`);
      }
    } catch (err) {
      setError(err.message || 'Upload failed. Please ensure file is a valid PDF under 8 MiB.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 mx-auto mb-4">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Authentication Required</h2>
        <p className="mt-2 text-sm text-slate-600 max-w-sm mx-auto">
          Please sign in to contribute lecture notes, PYQs, and academic course materials.
        </p>
        <div className="mt-6">
          <Link
            to="/auth"
            state={{ from: '/upload' }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-colors"
          >
            Sign In / Register
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="border-b border-slate-200 pb-6 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200/60 mb-3">
          <Upload className="w-3.5 h-3.5" />
          Document Contribution
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Upload Academic Document
        </h1>
        <p className="mt-2 text-base text-slate-600">
          Share your course lecture notes, previous-year question papers, lab manuals, or assignments with fellow students.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* PDF Dropzone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
            dragActive
              ? 'border-brand-500 bg-brand-50/50'
              : file
              ? 'border-emerald-300 bg-emerald-50/30'
              : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'
          }`}
        >
          {file ? (
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                <FileCheck className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-800">{file.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {(file.size / (1024 * 1024)).toFixed(2)} MB • Valid PDF document
              </p>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="mt-3 text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Change file
              </button>
            </div>
          ) : (
            <div>
              <div className="w-14 h-14 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-brand-600 mx-auto mb-3">
                <FileText className="w-7 h-7" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                Drag & drop your PDF file here, or{' '}
                <label className="text-brand-600 hover:text-brand-700 cursor-pointer font-bold underline">
                  browse files
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => handleFileChange(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                PDF format only. Maximum file size: 8 MiB (safely stored in MongoDB).
              </p>
            </div>
          )}
        </div>

        {/* Metadata Inputs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Academic Metadata
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Document Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Graph Algorithms & Shortest Path Lecture Notes"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Course Code *
              </label>
              <input
                type="text"
                required
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                placeholder="e.g. CS201"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none uppercase font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Course Name *
              </label>
              <input
                type="text"
                required
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="e.g. Data Structures and Algorithms"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subject / Department *
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Computer Science"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Academic Year *
              </label>
              <input
                type="text"
                required
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g. 2024-2025"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Semester *
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Resource Type *
              </label>
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none"
              >
                <option value="lecture-notes">Lecture Notes</option>
                <option value="pyq">PYQ (Question Paper)</option>
                <option value="lab-manual">Lab Manual</option>
                <option value="assignment">Assignment</option>
                <option value="reference">Reference Material</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description & Syllabus Topics (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline specific chapters, lecture numbers, or exam terms covered in this document..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-500 outline-none"
            />
          </div>
        </div>

        {/* Ingestion notice */}
        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-800 flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p>
            Upon upload, the document bytes are preserved in bounded database storage with an initial status of <strong className="font-semibold">queued</strong>. Page-by-page text extraction and Gemini embeddings will be indexed in Milestone 3.
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !file}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Uploading Document...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload and Publish Document
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
