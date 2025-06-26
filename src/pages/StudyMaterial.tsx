import React, { useState, useEffect } from 'react';
import { generateWithGemini } from '../lib/gemini';
import { Link } from 'react-router-dom';
import { useStudyMaterial, Subtopic, SubtopicContent } from './StudyMaterialContext';
import { BookOpen, Download, FileText } from 'lucide-react';

// PDF generation imports (you may need to install these packages)
// npm install jspdf html2canvas
let jsPDF: any = null;
let html2canvas: any = null;

// Dynamic imports for PDF libraries
const loadPDFLibraries = async () => {
  try {
    // @ts-ignore
    const jsPDFModule = await import('jspdf');
    // @ts-ignore
    const html2canvasModule = await import('html2canvas');
    jsPDF = jsPDFModule.default;
    html2canvas = html2canvasModule.default;
  } catch (error) {
    console.error('PDF libraries not available:', error);
    throw new Error('PDF generation libraries not installed. Please run: npm install jspdf html2canvas');
  }
};

// Helper to fetch YouTube videos with improved error handling
async function fetchYouTubeVideos(query: string, apiKey: string) {
  try {
    // Add educational keywords to improve search results
    const searchQuery = `${query} tutorial programming education`;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=3&key=${apiKey}&videoDuration=medium&relevanceLanguage=en`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('YouTube API access forbidden. Please check your API key and quota.');
      } else if (response.status === 429) {
        throw new Error('YouTube API rate limit exceeded.');
      } else {
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`YouTube API error: ${data.error.message}`);
    }
    
    if (!data.items || !Array.isArray(data.items)) {
      console.warn('No YouTube videos found for:', query);
      return [];
    }
    
    // Filter and format the videos
    const videos = data.items
      .filter((item: any) => item.snippet && item.id && item.id.videoId)
      .map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt
      }))
      .slice(0, 3);
    
    return videos;
  } catch (error) {
    console.error('YouTube API error for query:', query, error);
    return [];
  }
}

export function StudyMaterial() {
  const { topic, setTopic, subtopics, setSubtopics, subtopicContent, setSubtopicContent } = useStudyMaterial();
  const [selectedSubtopic, setSelectedSubtopic] = useState<string>('');
  const [input, setInput] = useState(topic || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoGenerateTriggered, setAutoGenerateTriggered] = useState(false);
  const [autoGenerateReason, setAutoGenerateReason] = useState<string | null>(null);
  const [allSubtopics, setAllSubtopics] = useState<Subtopic[]>([]);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [generatingMore, setGeneratingMore] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || '';

  // Debug logging
  console.log('Debug - allSubtopics length:', allSubtopics.length);
  console.log('Debug - generatedCount:', generatedCount);
  console.log('Debug - subtopics length:', subtopics.length);
  console.log('Debug - should show button:', generatedCount < allSubtopics.length);

  useEffect(() => {
    // Check if we should auto-generate from performance recommendation
    const autoGenerateTopic = localStorage.getItem('autoGenerateTopic');
    const autoGenerateReason = localStorage.getItem('autoGenerateReason');
    
    if (autoGenerateTopic && autoGenerateReason && !autoGenerateTriggered && !loading) {
      setInput(autoGenerateTopic);
      setAutoGenerateTriggered(true);
      setAutoGenerateReason(autoGenerateReason);
      // Clear the localStorage
      localStorage.removeItem('autoGenerateTopic');
      localStorage.removeItem('autoGenerateReason');
      // Auto-trigger generation after a short delay
      setTimeout(() => {
        handleAutoGenerate(autoGenerateTopic, autoGenerateReason);
      }, 500);
    }
  }, [autoGenerateTriggered, loading]);

  // Restore state from localStorage when component mounts
  useEffect(() => {
    const savedAllSubtopics = localStorage.getItem('studyMaterial_allSubtopics');
    const savedGeneratedCount = localStorage.getItem('studyMaterial_generatedCount');
    const savedTopic = localStorage.getItem('studyMaterial_topic');
    
    if (savedAllSubtopics && savedGeneratedCount && savedTopic === topic) {
      try {
        setAllSubtopics(JSON.parse(savedAllSubtopics));
        setGeneratedCount(parseInt(savedGeneratedCount));
        console.log('Debug - Restored from localStorage:', {
          allSubtopics: JSON.parse(savedAllSubtopics).length,
          generatedCount: parseInt(savedGeneratedCount)
        });
      } catch (error) {
        console.error('Error restoring state from localStorage:', error);
      }
    }
  }, [topic]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (allSubtopics.length > 0) {
      localStorage.setItem('studyMaterial_allSubtopics', JSON.stringify(allSubtopics));
      localStorage.setItem('studyMaterial_generatedCount', generatedCount.toString());
      localStorage.setItem('studyMaterial_topic', topic);
    }
  }, [allSubtopics, generatedCount, topic]);

  const generateSubtopicContent = async (subtopic: Subtopic, topicName: string) => {
    const content: SubtopicContent = {};
    
    // Documentation - Generate concise, one-page content
    try {
      const docPrompt = `Write a concise, one-page study guide for "${subtopic.title}" (part of "${topicName}"). Keep it brief and to the point. Include:
      - Brief definition (2-3 sentences)
      - Key concepts with bullet points
      - One simple code example with explanation
      - 2-3 real-world use cases
      - Common pitfalls to avoid
      
      Format: Use clear headings, bullet points, and one well-commented code block. Keep total length under 500 words. Focus on essential information only.`;
      content.documentation = await generateWithGemini(docPrompt);
    } catch (err: any) {
      if (err.message?.includes('429')) {
        throw new Error('Gemini API rate limit reached. Please wait a few minutes and try again.');
      } else {
        throw new Error('Failed to generate study material. Please try again later.');
      }
    }
    
    // Websites
    try {
      const webPrompt = `List 3-5 high-quality websites for learning about: "${subtopic.title}". Return only the URLs as a JSON array. Do NOT include any explanation or text outside the JSON array.`;
      let webRes = await generateWithGemini(webPrompt);
      let cleaned = webRes.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
      }
      content.websites = JSON.parse(cleaned);
    } catch (err: any) {
      if (err.message?.includes('429')) {
        throw new Error('Gemini API rate limit reached. Please wait a few minutes and try again.');
      } else {
        content.websites = [];
      }
    }
    
    // Videos - Improved YouTube API handling
    content.videos = [];
    if (YOUTUBE_API_KEY && YOUTUBE_API_KEY !== '') {
      try {
        const videos = await fetchYouTubeVideos(subtopic.title, YOUTUBE_API_KEY);
        if (videos && Array.isArray(videos) && videos.length > 0) {
          content.videos = videos;
        }
      } catch (err: any) {
        console.warn('YouTube API error for', subtopic.title, ':', err);
        // Don't throw error, just continue without videos
      }
    }
    
    return content;
  };

  const handleAutoGenerate = async (topic: string, reason: string) => {
    setError('');
    setSubtopics([]);
    setSubtopicContent({});
    setAllSubtopics([]);
    setGeneratedCount(0);
    setTopic(topic);
    setLoading(true);
    
    // Clear localStorage for new topic
    localStorage.removeItem('studyMaterial_allSubtopics');
    localStorage.removeItem('studyMaterial_generatedCount');
    localStorage.removeItem('studyMaterial_topic');
    
    try {
      // 1. Get all subtopics first
      const subtopicPrompt = `For the topic "${topic}", list the 5-8 most important subtopics as a JSON array of objects. Each object must have a 'title' (string) and a 'summary' (string). Do NOT include any explanation or text outside the JSON array. Example: [{"title": "Stack", "summary": "A stack is a linear data structure..."}, ...]`;
      const subtopicsRaw = await generateWithGemini(subtopicPrompt);
      let allSubtopicsList: Subtopic[] = [];
      try {
        let cleaned = subtopicsRaw.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
        }
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (typeof parsed[0] === 'object' && parsed[0].title) {
            allSubtopicsList = parsed;
          } else if (typeof parsed[0] === 'string') {
            allSubtopicsList = parsed.map((t: string) => ({ title: t, summary: '' }));
          }
        }
      } catch (err: any) {
        setError('Could not parse Gemini response.');
        setLoading(false);
        return;
      }
      
      if (!allSubtopicsList.length) {
        setError('No subtopics found.');
        setLoading(false);
        return;
      }
      
      setAllSubtopics(allSubtopicsList);
      
      // 2. Generate content for first 3 subtopics only
      const initialSubtopics = allSubtopicsList.slice(0, 3);
      const content: Record<string, SubtopicContent> = {};
      
      for (const sub of initialSubtopics) {
        try {
          content[sub.title] = await generateSubtopicContent(sub, topic);
        } catch (err: any) {
          setError(err.message);
          setLoading(false);
          return;
        }
      }
      
      setSubtopicContent(content);
      setSubtopics(initialSubtopics);
      setGeneratedCount(3);
      
      console.log('Debug - After initial generation:', {
        allSubtopicsLength: allSubtopicsList.length,
        initialSubtopicsLength: initialSubtopics.length,
        generatedCount: 3,
        shouldShowButton: 3 < allSubtopicsList.length
      });
      
      if (initialSubtopics.length > 0) {
        setSelectedSubtopic(initialSubtopics[0].title);
      }
      
    } catch (err: any) {
      if (err.message?.includes('429')) {
        setError('Gemini API rate limit reached. Please wait a few minutes and try again.');
      } else {
        setError('Failed to generate study material. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMore = async () => {
    if (generatedCount >= allSubtopics.length) return;
    
    setGeneratingMore(true);
    setError('');
    
    try {
      const nextBatch = allSubtopics.slice(generatedCount, generatedCount + 3);
      const newContent: Record<string, SubtopicContent> = {};
      
      for (const sub of nextBatch) {
        try {
          newContent[sub.title] = await generateSubtopicContent(sub, topic);
        } catch (err: any) {
          setError(err.message);
          setGeneratingMore(false);
          return;
        }
      }
      
      // Merge with existing content from context
      const mergedContent = { ...subtopicContent, ...newContent };
      
      setSubtopicContent(mergedContent);
      setSubtopics([...subtopics, ...nextBatch]);
      setGeneratedCount(generatedCount + nextBatch.length);
      
      console.log('Debug - After generating more:', {
        newCount: generatedCount + nextBatch.length,
        totalSubtopics: allSubtopics.length,
        shouldShowButton: (generatedCount + nextBatch.length) < allSubtopics.length
      });
      
    } catch (err: any) {
      if (err.message?.includes('429')) {
        setError('Gemini API rate limit reached. Please wait a few minutes and try again.');
      } else {
        setError('Failed to generate more study material. Please try again later.');
      }
    } finally {
      setGeneratingMore(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setError('');
    setSubtopics([]);
    setSubtopicContent({});
    setAllSubtopics([]);
    setGeneratedCount(0);
    setTopic(input);
    setLoading(true);
    
    // Clear localStorage for new topic
    localStorage.removeItem('studyMaterial_allSubtopics');
    localStorage.removeItem('studyMaterial_generatedCount');
    localStorage.removeItem('studyMaterial_topic');
    
    try {
      // 1. Get all subtopics first
      const subtopicPrompt = `For the topic "${input}", list the 5-8 most important subtopics as a JSON array of objects. Each object must have a 'title' (string) and a 'summary' (string). Do NOT include any explanation or text outside the JSON array. Example: [{"title": "Stack", "summary": "A stack is a linear data structure..."}, ...]`;
      const subtopicsRaw = await generateWithGemini(subtopicPrompt);
      let allSubtopicsList: Subtopic[] = [];
      try {
        let cleaned = subtopicsRaw.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
        }
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (typeof parsed[0] === 'object' && parsed[0].title) {
            allSubtopicsList = parsed;
          } else if (typeof parsed[0] === 'string') {
            allSubtopicsList = parsed.map((t: string) => ({ title: t, summary: '' }));
          }
        }
      } catch (err: any) {
        setError('Could not parse Gemini response.');
        setLoading(false);
        return;
      }
      
      if (!allSubtopicsList.length) {
        setError('No subtopics found.');
        setLoading(false);
        return;
      }
      
      setAllSubtopics(allSubtopicsList);
      
      // 2. Generate content for first 3 subtopics only
      const initialSubtopics = allSubtopicsList.slice(0, 3);
      const content: Record<string, SubtopicContent> = {};
      
      for (const sub of initialSubtopics) {
        try {
          content[sub.title] = await generateSubtopicContent(sub, input);
        } catch (err: any) {
          setError(err.message);
          setLoading(false);
          return;
        }
      }
      
      setSubtopicContent(content);
      setSubtopics(initialSubtopics);
      setGeneratedCount(3);
      
      console.log('Debug - After initial generation:', {
        allSubtopicsLength: allSubtopicsList.length,
        initialSubtopicsLength: initialSubtopics.length,
        generatedCount: 3,
        shouldShowButton: 3 < allSubtopicsList.length
      });
      
    } catch (err: any) {
      if (err.message?.includes('429')) {
        setError('Gemini API rate limit reached. Please wait a few minutes and try again.');
      } else {
        setError('Failed to generate study material. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  // PDF Generation Function
  const generatePDF = async () => {
    setGeneratingPDF(true);
    setError('');

    try {
      // Load PDF libraries
      await loadPDFLibraries();
      
      if (!jsPDF || !html2canvas) {
        throw new Error('PDF generation libraries not available. Please install: npm install jspdf html2canvas');
      }

      // Helper function to clean text
      const cleanText = (text: string) => {
        return text
          .replace(/[³ØÜÖ]/g, '') // Remove special characters
          .replace(/[•◦]/g, '•') // Standardize bullet points
          .replace(/\s+/g, ' ') // Remove extra spaces
          .trim();
      };

      // Helper function to split text into proper lines
      const splitTextProperly = (text: string, maxWidth: number) => {
        const cleanedText = cleanText(text);
        const words = cleanedText.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          if (pdf.getTextWidth(testLine) <= maxWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              // Word is too long, split it
              lines.push(word);
            }
          }
        }
        if (currentLine) {
          lines.push(currentLine);
        }
        return lines;
      };

      // Create PDF document
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (2 * margin);
      let yPosition = margin;

      // Add title page with gradient-like effect
      pdf.setFillColor(59, 130, 246); // Blue background
      pdf.rect(0, 0, pageWidth, 60, 'F');
      
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('Study Material', pageWidth / 2, 35, { align: 'center' });
      
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Topic: ${topic}`, pageWidth / 2, 50, { align: 'center' });
      
      // Reset text color
      pdf.setTextColor(0, 0, 0);
      yPosition = 80;

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 30;

      // Add table of contents with styling
      pdf.setFillColor(243, 244, 246); // Light gray background
      pdf.rect(margin - 5, yPosition - 5, contentWidth + 10, 20, 'F');
      
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(59, 130, 246); // Blue color for heading
      pdf.text('Table of Contents', margin, yPosition);
      yPosition += 15;

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      subtopics.forEach((subtopic, index) => {
        pdf.text(`${index + 1}. ${cleanSubtopicTitle(subtopic.title)}`, margin + 5, yPosition);
        yPosition += 8;
      });

      yPosition += 25;

      // Add content for each subtopic
      for (let i = 0; i < subtopics.length; i++) {
        const subtopic = subtopics[i];
        const content = subtopicContent[subtopic.title];

        if (!content) continue;

        // Check if we need a new page
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = margin;
        }

        // Subtopic title with styling
        pdf.setFillColor(59, 130, 246); // Blue background
        pdf.rect(margin - 5, yPosition - 5, contentWidth + 10, 15, 'F');
        
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text(`${i + 1}. ${cleanSubtopicTitle(subtopic.title)}`, margin, yPosition + 5);
        yPosition += 20;

        // Reset text color
        pdf.setTextColor(0, 0, 0);

        // Subtopic summary
        if (subtopic.summary) {
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'italic');
          pdf.setTextColor(107, 114, 128); // Gray color
          const summaryText = cleanSubtopicContent(subtopic.summary);
          const summaryLines = splitTextProperly(summaryText, contentWidth);
          pdf.text(summaryLines, margin, yPosition);
          yPosition += (summaryLines.length * 6) + 8;
          pdf.setTextColor(0, 0, 0);
        }

        // Documentation content - FULL CONTENT
        if (content.documentation) {
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'normal');
          
          // Split content into sections and clean each section
          const sections = content.documentation.split('\n\n');
          
          for (const section of sections) {
            if (yPosition > pageHeight - 60) {
              pdf.addPage();
              yPosition = margin;
            }

            const cleanedSection = cleanText(section);

            if (cleanedSection.trim().startsWith('#')) {
              // This is a heading
              pdf.setFontSize(14);
              pdf.setFont('helvetica', 'bold');
              pdf.setTextColor(16, 185, 129); // Green color for headings
              const heading = cleanedSection.replace(/^#+\s*/, '');
              pdf.text(heading, margin, yPosition);
              yPosition += 12;
              pdf.setTextColor(0, 0, 0);
            } else if (cleanedSection.includes('```')) {
              // This is a code block
              const codeMatch = cleanedSection.match(/```[\s\S]*?```/);
              if (codeMatch) {
                const code = codeMatch[0].replace(/```/g, '').trim();
                
                // Calculate code block dimensions
                const codeLines = splitTextProperly(code, contentWidth - 12);
                const lineHeight = 4.5; // Smaller line height for compact look
                const padding = 4; // Smaller padding
                const codeHeight = (codeLines.length * lineHeight) + (padding * 2);
                
                // Check if code block fits on current page
                if (yPosition + codeHeight > pageHeight - 20) {
                  pdf.addPage();
                  yPosition = margin;
                }
                
                // Add code block with dark background (Monaco-like)
                pdf.setFillColor(30, 30, 30); // Dark gray background
                pdf.rect(margin, yPosition, contentWidth, codeHeight, 'F');
                
                // Add subtle border
                pdf.setDrawColor(60, 60, 60);
                pdf.setLineWidth(0.3);
                pdf.rect(margin, yPosition, contentWidth, codeHeight, 'S');
                
                // Code text with smaller font and proper colors
                pdf.setFontSize(9); // Smaller font size
                pdf.setFont('courier', 'normal');
                pdf.setTextColor(220, 220, 220); // Light gray text
                
                // Add code with proper padding
                codeLines.forEach((line, index) => {
                  // Handle different code elements with colors
                  let textColor = [220, 220, 220]; // Default light gray
                  
                  // Simple syntax highlighting
                  if (line.includes('def ') || line.includes('function ') || line.includes('class ')) {
                    textColor = [86, 156, 214]; // Blue for functions/classes
                  } else if (line.includes('if ') || line.includes('else ') || line.includes('for ') || line.includes('while ')) {
                    textColor = [197, 134, 192]; // Purple for keywords
                  } else if (line.includes('"') || line.includes("'")) {
                    textColor = [206, 145, 120]; // Orange for strings
                  } else if (line.includes('//') || line.includes('#')) {
                    textColor = [87, 166, 74]; // Green for comments
                  } else if (line.includes('true') || line.includes('false') || line.includes('null') || line.includes('undefined')) {
                    textColor = [86, 156, 214]; // Blue for literals
                  }
                  
                  pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
                  pdf.text(line, margin + 6, yPosition + padding + 2 + (index * lineHeight));
                });
                
                yPosition += codeHeight + 8;
                pdf.setTextColor(0, 0, 0); // Reset to black
              }
            } else {
              // Regular text - FULL CONTENT
              pdf.setFontSize(11);
              pdf.setFont('helvetica', 'normal');
              
              // Handle bullet points and lists
              if (cleanedSection.includes('•') || cleanedSection.includes('-')) {
                const lines = cleanedSection.split('\n');
                for (const line of lines) {
                  if (yPosition > pageHeight - 20) {
                    pdf.addPage();
                    yPosition = margin;
                  }
                  
                  const cleanLine = cleanText(line);
                  if (cleanLine.trim()) {
                    pdf.text(cleanLine, margin, yPosition);
                    yPosition += 7;
                  }
                }
              } else {
                const textLines = splitTextProperly(cleanedSection, contentWidth);
                
                // Check if text fits on current page
                const textHeight = textLines.length * 7;
                if (yPosition + textHeight > pageHeight - 20) {
                  pdf.addPage();
                  yPosition = margin;
                }
                
                textLines.forEach((line, index) => {
                  pdf.text(line, margin, yPosition + (index * 7));
                });
                yPosition += textHeight + 6;
              }
            }
          }
        }

        // Add websites section
        if (content.websites && content.websites.length > 0) {
          if (yPosition > pageHeight - 60) {
            pdf.addPage();
            yPosition = margin;
          }

          pdf.setFontSize(13);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(59, 130, 246); // Blue color
          pdf.text('Recommended Websites:', margin, yPosition);
          yPosition += 12;

          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(0, 0, 0);
          content.websites.forEach((website: string) => {
            pdf.text(`• ${website}`, margin + 5, yPosition);
            yPosition += 7;
          });
          yPosition += 10;
        }

        // Add videos section
        if (content.videos && content.videos.length > 0) {
          if (yPosition > pageHeight - 60) {
            pdf.addPage();
            yPosition = margin;
          }

          pdf.setFontSize(13);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(239, 68, 68); // Red color
          pdf.text('Recommended Videos:', margin, yPosition);
          yPosition += 12;

          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(0, 0, 0);
          content.videos.forEach((video: any) => {
            pdf.text(`• ${video.title}`, margin + 5, yPosition);
            yPosition += 7;
            if (video.channelTitle) {
              pdf.setTextColor(107, 114, 128); // Gray color
              pdf.text(`  Channel: ${video.channelTitle}`, margin + 10, yPosition);
              yPosition += 7;
              pdf.setTextColor(0, 0, 0);
            }
          });
          yPosition += 15;
        }

        yPosition += 25; // Space between subtopics
      }

      // Save PDF
      const fileName = `${topic.replace(/[^a-zA-Z0-9]/g, '_')}_study_material.pdf`;
      pdf.save(fileName);
      
    } catch (error: any) {
      console.error('PDF generation error:', error);
      if (error.message.includes('not installed')) {
        setError('PDF generation requires additional packages. Please run: npm install jspdf html2canvas');
      } else {
        setError('Failed to generate PDF. Please try again.');
      }
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Helper function to clean subtopic content
  const cleanSubtopicContent = (text: string) => {
    return text
      .replace(/[³ØÜÖ]/g, '') // Remove special characters
      .replace(/[•◦]/g, '•') // Standardize bullet points
      .replace(/[*#]+/g, '') // Remove markdown characters
      .replace(/\.{2,}/g, '.') // Remove multiple dots
      .replace(/\s+/g, ' ') // Remove extra spaces
      .replace(/^\s*[-*+]\s*/, '') // Remove leading list markers
      .replace(/^\s*[0-9]+\.\s*/, '') // Remove leading numbers
      .trim();
  };

  // Helper function to clean subtopic title
  const cleanSubtopicTitle = (title: string) => {
    return title
      .replace(/[³ØÜÖ]/g, '') // Remove special characters
      .replace(/[*#]+/g, '') // Remove markdown characters
      .replace(/\.{2,}/g, '.') // Remove multiple dots
      .replace(/\s+/g, ' ') // Remove extra spaces
      .replace(/^\s*[-*+]\s*/, '') // Remove leading list markers
      .replace(/^\s*[0-9]+\.\s*/, '') // Remove leading numbers
      .trim();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Auto-generate indicator */}
        {autoGenerateReason && (
          <div className="bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-xl p-4 mb-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-white/20 rounded-full p-2 mr-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">AI Recommendation</h3>
                  <p className="text-blue-100">{autoGenerateReason}</p>
                </div>
              </div>
              <button
                onClick={() => setAutoGenerateReason(null)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">Study Material Generator</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Generate comprehensive study materials for any topic with AI-powered documentation, 
            video recommendations, and curated learning resources.
          </p>
        </div>

        <form onSubmit={handleGenerate} className="flex flex-col md:flex-row gap-4 items-center justify-center mb-8">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Enter a topic (e.g. DSA, React, Algorithms)"
            className="flex-1 px-5 py-3 rounded-xl border border-blue-200 bg-white shadow-sm text-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          <button
            type="submit"
            className="bg-gradient-to-r from-blue-500 to-teal-500 text-white px-8 py-3 rounded-xl font-semibold text-lg shadow hover:from-blue-600 hover:to-teal-600 transition-all duration-200"
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate'}
          </button>
        </form>
        {error && <div className="text-red-400 text-center whitespace-pre-wrap break-words font-medium">{error}</div>}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mb-4"></div>
            <div className="text-blue-400 text-lg font-semibold">Generating all subtopic details. This may take a moment...</div>
          </div>
        )}
        {!loading && subtopics.length > 0 && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-blue-700 mb-4">Subtopics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {subtopics.map((sub, idx) => (
                <div key={idx} className="bg-white rounded-2xl shadow-md p-6 flex flex-col justify-between border border-blue-100 hover:shadow-lg transition-all">
                  <div>
                    <div className="font-bold text-xl text-blue-700 mb-2 flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-blue-400" />
                      {cleanSubtopicTitle(sub.title)}
                    </div>
                    <div className="text-slate-600 text-base mb-4 min-h-[60px]">{cleanSubtopicContent(sub.summary)}</div>
                  </div>
                  <Link
                    to={`/study/${encodeURIComponent(input)}/${encodeURIComponent(sub.title)}`}
                    className="mt-auto bg-gradient-to-r from-blue-500 to-teal-500 text-white px-6 py-2 rounded-lg font-semibold text-base shadow hover:from-blue-600 hover:to-teal-600 transition-all duration-200 text-center"
                  >
                    View Details
                  </Link>
                </div>
              ))}
            </div>
            
            {/* Generate More Button */}
            {(generatedCount < allSubtopics.length || (allSubtopics.length > 3 && subtopics.length < allSubtopics.length)) && (
              <div className="mt-6 text-center">
                <button
                  onClick={handleGenerateMore}
                  disabled={generatingMore}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-3 rounded-xl font-semibold text-lg shadow-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 flex items-center justify-center mx-auto gap-2"
                >
                  {generatingMore ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Generating More...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Generate More ({allSubtopics.length - generatedCount} remaining)
                    </>
                  )}
                </button>
                <p className="text-slate-600 mt-2 text-sm">
                  Generate {Math.min(3, allSubtopics.length - generatedCount)} more subtopics
                </p>
              </div>
            )}

            {/* Generate PDF Button */}
            {subtopics.length > 0 && (
              <div className="mt-8 text-center">
                <button
                  onClick={generatePDF}
                  disabled={generatingPDF}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-xl font-semibold text-lg shadow-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center justify-center mx-auto gap-2"
                >
                  {generatingPDF ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      Generate PDF
                    </>
                  )}
                </button>
                <p className="text-slate-600 mt-2 text-sm">
                  Download all study material as a PDF document
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default StudyMaterial; 