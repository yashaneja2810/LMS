import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Download, Trash2, FileText, Calendar, Clock } from 'lucide-react';

interface PDFFile {
  name: string;
  id: string;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
  metadata: {
    size: number;
    mimetype: string;
  };
}

export function PDFs() {
  const { user } = useAuth();
  const [pdfs, setPdfs] = useState<PDFFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchPDFs();
    }
  }, [user]);

  const fetchPDFs = async () => {
    try {
      setLoading(true);
      const userFolder = user?.id || 'default';
      const { data, error } = await supabase.storage
        .from('pdf')
        .list(userFolder, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });
      if (error) {
        const { data: rootData, error: rootError } = await supabase.storage
          .from('pdf')
          .list('', {
            limit: 100,
            offset: 0,
            sortBy: { column: 'created_at', order: 'desc' }
          });
        if (rootError) {
          return;
        }
        setPdfs(rootData || []);
        return;
      }
      setPdfs(data || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async (fileName: string) => {
    try {
      const userFolder = user?.id || 'default';
      const filePath = `${userFolder}/${fileName}`;
      let { data, error } = await supabase.storage
        .from('pdf')
        .download(filePath);
      if (error) {
        const { data: rootData, error: rootError } = await supabase.storage
          .from('pdf')
          .download(fileName);
        if (rootError) {
          return;
        }
        data = rootData;
      }
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {}
  };

  const deletePDF = async (fileName: string) => {
    if (!confirm('Are you sure you want to delete this PDF?')) {
      return;
    }
    try {
      setDeleting(fileName);
      const userFolder = user?.id || 'default';
      const filePath = `${userFolder}/${fileName}`;
      const { error } = await supabase.storage
        .from('pdf')
        .remove([filePath]);
      if (error) {
        const { error: rootError } = await supabase.storage
          .from('pdf')
          .remove([fileName]);
        if (rootError) {
          return;
        }
      }
      setPdfs(pdfs.filter(pdf => pdf.name !== fileName));
    } catch (error) {
    } finally {
      setDeleting(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-2 flex items-center gap-3">
            <FileText className="w-10 h-10 text-black" />
            My Generated PDFs
          </h1>
          <p className="text-gray-500 text-lg">
            View and manage all your generated study material PDFs
          </p>
        </div>

        {/* Stats Card */}
        <div className="bg-white rounded-2xl p-6 mb-8 border border-gray-200 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-black">{pdfs.length}</div>
              <div className="text-gray-500">Total PDFs</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-black">
                {formatFileSize(pdfs.reduce((acc, pdf) => acc + (pdf.metadata?.size || 0), 0))}
              </div>
              <div className="text-gray-500">Total Size</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-black">
                {pdfs.length > 0 ? formatDate(pdfs[0].created_at) : 'N/A'}
              </div>
              <div className="text-gray-500">Latest PDF</div>
            </div>
          </div>
        </div>

        {/* PDFs Grid */}
        {pdfs.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-black mb-2">No PDFs Found</h3>
            <p className="text-gray-500">
              Generate some study material PDFs to see them here
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pdfs.map((pdf) => (
              <div
                key={pdf.name}
                className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-between"
              >
                {/* PDF Icon and Name */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="bg-gray-100 p-3 rounded-xl">
                      <FileText className="w-6 h-6 text-gray-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-black truncate">
                        {pdf.name.replace('.pdf', '')}
                      </h3>
                      <p className="text-gray-500 text-sm">
                        {formatFileSize(pdf.metadata?.size || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Date Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span>Created: {formatDate(pdf.created_at)}</span>
                  </div>
                  {pdf.updated_at !== pdf.created_at && (
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>Updated: {formatDate(pdf.updated_at)}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => downloadPDF(pdf.name)}
                    className="flex-1 bg-black hover:bg-gray-900 text-white px-4 py-2 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 group-hover:scale-105 font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={() => deletePDF(pdf.name)}
                    disabled={deleting === pdf.name}
                    className="bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-black px-4 py-2 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 group-hover:scale-105 font-medium"
                  >
                    {deleting === pdf.name ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <button
            onClick={fetchPDFs}
            className="bg-black hover:bg-gray-900 text-white px-6 py-3 rounded-xl border border-gray-200 transition-all duration-200 hover:scale-105 font-medium"
          >
            Refresh PDFs
          </button>
        </div>
      </div>
    </div>
  );
}

export default PDFs; 