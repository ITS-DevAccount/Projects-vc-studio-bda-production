'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Logo from '@/components/branding/Logo';
import { Home, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Policy {
  id: string;
  title: string;
  content: string;
  effective_date: string;
  version: number;
}

export default function TermsOfService() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      const response = await fetch('/api/policies/terms_of_service');
      if (!response.ok) throw new Error('Failed to fetch policy');
      const data = await response.json();
      setPolicy(data);
    } catch (error) {
      console.error('Error fetching policy:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!policy || !contentRef.current) return;

    try {
      setDownloading(true);
      
      // Create a temporary container for PDF generation
      const pdfContainer = document.createElement('div');
      pdfContainer.style.position = 'absolute';
      pdfContainer.style.left = '-9999px';
      pdfContainer.style.width = '800px';
      pdfContainer.style.padding = '40px';
      pdfContainer.style.backgroundColor = '#ffffff';
      pdfContainer.style.color = '#032c60';
      pdfContainer.style.fontFamily = '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
      
      // Add title and metadata
      const title = document.createElement('h1');
      title.textContent = policy.title;
      title.style.fontSize = '28px';
      title.style.fontWeight = 'bold';
      title.style.marginBottom = '16px';
      title.style.color = '#032c60';
      pdfContainer.appendChild(title);

      const meta = document.createElement('p');
      meta.textContent = `Last Updated: ${new Date(policy.effective_date).toLocaleDateString('en-GB')}${policy.version > 1 ? ` (Version ${policy.version})` : ''}`;
      meta.style.fontSize = '14px';
      meta.style.color = '#5c7ea3';
      meta.style.marginBottom = '32px';
      pdfContainer.appendChild(meta);

      // Add content
      const contentDiv = document.createElement('div');
      contentDiv.innerHTML = policy.content;
      contentDiv.style.fontSize = '14px';
      contentDiv.style.lineHeight = '1.75';
      contentDiv.style.color = '#2a5a8f';
      pdfContainer.appendChild(contentDiv);

      document.body.appendChild(pdfContainer);

      // Generate canvas from HTML
      const canvas = await html2canvas(pdfContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      document.body.removeChild(pdfContainer);

      // Calculate PDF dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;

      // Add first page
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save PDF
      pdf.save('VC-Studio-Terms-of-Service.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-background text-brand-text flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-brand-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full bg-brand-background text-brand-text">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-section-light border-b border-section-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo variant="compact" linkTo="/" />
            <Link
              href="/"
              className="text-brand-text-light hover:text-accent-primary transition font-medium flex items-center gap-2 text-sm sm:text-base"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <Link 
            href="/" 
            className="text-accent-primary hover:text-accent-primary-hover inline-block transition text-sm sm:text-base"
          >
            ← Back to Home
          </Link>
          
          {policy && (
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="inline-flex items-center gap-2 bg-accent-primary hover:bg-accent-primary-hover disabled:bg-neutral-400 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition shadow-md hover:shadow-lg text-sm sm:text-base"
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Generating PDF...' : 'Download as PDF'}
            </button>
          )}
        </div>
        
        {policy ? (
          <div ref={contentRef}>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 text-brand-text">
              {policy.title}
            </h1>
            <p className="text-sm sm:text-base text-brand-text-muted mb-6 sm:mb-8">
              Last Updated: {new Date(policy.effective_date).toLocaleDateString('en-GB')}
              {policy.version > 1 && ` (Version ${policy.version})`}
            </p>
            
            <div 
              className="prose prose-sm sm:prose-base lg:prose-lg max-w-none text-brand-text-light"
              dangerouslySetInnerHTML={{ __html: policy.content }} 
            />
          </div>
        ) : (
          <p className="text-brand-text-muted">Policy not found</p>
        )}
      </div>
    </main>
  );
}

