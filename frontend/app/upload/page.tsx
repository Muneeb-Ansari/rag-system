'use client';

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000';

import Link from 'next/link';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/file-upload';
import { useEffect, useMemo, useState } from 'react';

interface Document {
  id: string;
  name: string;
}

export default function UploadPage() {

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchDocuments() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/get-documents`);
      if (!response.ok) {
        setDocuments([]);
        return;
      }
      const data = await response.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDocuments();
  }, []);

  const memoizedDocuments = useMemo(() => {
    return documents;
  }, [documents]);

  async function handleDelete(documentId: string) {
    try {
      setDeletingId(documentId);
      await fetch(`${API_BASE_URL}/api/delete-document/${documentId}`, { method: 'DELETE' });
      fetchDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-muted-foreground">Upload Document</p>
            <h1 className="mt-2 text-3xl font-semibold text-foreground">Upload a document for RAG processing</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Upload PDFs, DOCX, TXT, or Markdown files and then return to the chat to ask questions about your documents.
            </p>
          </div>

          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back to chat
            </Link>
          </Button>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <FileUpload />
        </div>

        <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm">

          <h2 className="mb-4 text-xl font-semibold">
            Uploaded Documents
          </h2>

          {loading ? (
            <p>Loading documents...</p>
          ) : memoizedDocuments.length === 0 ? (
            <p>No Documents uploaded yet.</p>
          ) : (
            <ul className="space-y-3">
              {memoizedDocuments.map((doc) => (
                <div  key={doc.id} className="flex justify-between">
                  <li
                    key={doc.id}
                    className="rounded-xl border p-3"
                  >
                    {doc.name}
                  </li>
                  <div className="ml-4">
                    {deletingId === doc.id ? (
                      <Loader2 className="animate-spin text-muted-foreground" />
                    ) : (
                      <Trash2
                        onClick={() => handleDelete(doc.id)}
                        className="cursor-pointer hover:text-destructive"
                      />
                    )}
                  </div>
                </div>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
