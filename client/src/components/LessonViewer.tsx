import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Video, ExternalLink, Play, Maximize2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
  videoUrl?: string; // External video URL support
}

// Helper to extract YouTube video ID
const getYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /youtube\.com\/shorts\/([^&\s?]+)/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// Helper to extract Vimeo video ID
const getVimeoVideoId = (url: string): string | null => {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
};

export const LessonViewer: React.FC<Props> = ({ fileUrl, fileType, fileName, videoUrl: initialVideoUrl }) => {
  const [externalVideoUrl, setExternalVideoUrl] = useState(initialVideoUrl || "");
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [pdfError, setPdfError] = useState(false);

  if (!fileUrl && !externalVideoUrl) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50">
          <CardTitle className="flex items-center gap-2 text-gray-700">
            <FileText className="h-5 w-5" />
            No Document Available
          </CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <FileText className="h-16 w-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500">This lesson does not have an attached document.</p>
          
          {/* External video URL input */}
          <div className="mt-6 max-w-md mx-auto">
            <p className="text-sm text-gray-400 mb-3">Or watch a video from URL:</p>
            <div className="flex gap-2">
              <Input
                placeholder="Paste YouTube/Vimeo URL..."
                value={externalVideoUrl}
                onChange={(e) => setExternalVideoUrl(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={() => setShowVideoInput(true)}
                disabled={!externalVideoUrl}
                className="bg-gradient-to-r from-red-500 to-pink-500"
              >
                <Play className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const type = (fileType || fileName || "").toLowerCase();
  
  const DownloadButton = () => (
    <Button asChild variant="outline" size="sm" className="gap-2 shadow-sm">
      <a href={fileUrl} download={fileName} target="_blank" rel="noreferrer">
        <Download className="h-4 w-4" />
        Download
      </a>
    </Button>
  );

  // Render external video (YouTube/Vimeo)
  const renderExternalVideo = (url: string) => {
    const youtubeId = getYouTubeVideoId(url);
    const vimeoId = getVimeoVideoId(url);

    if (youtubeId) {
      return (
        <div className="relative w-full pt-[56.25%] bg-black rounded-lg overflow-hidden">
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${youtubeId}?rel=0`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    if (vimeoId) {
      return (
        <div className="relative w-full pt-[56.25%] bg-black rounded-lg overflow-hidden">
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://player.vimeo.com/video/${vimeoId}`}
            title="Vimeo video"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    // Generic video URL
    return (
      <video controls className="w-full max-h-[720px] rounded-lg" preload="metadata">
        <source src={url} />
        Your browser does not support the video tag.
      </video>
    );
  };

  // Video preview (uploaded or external)
  if (type.includes("video") || fileUrl?.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i)) {
    return (
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 pb-3">
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <Video className="h-5 w-5" />
            Video Lesson
          </CardTitle>
          <div className="flex gap-2">
            {fileUrl && <DownloadButton />}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="uploaded" className="w-full">
            <TabsList className="w-full rounded-none border-b bg-gray-50">
              <TabsTrigger value="uploaded" className="flex-1">Uploaded Video</TabsTrigger>
              <TabsTrigger value="external" className="flex-1">External URL</TabsTrigger>
            </TabsList>
            <TabsContent value="uploaded" className="m-0">
              <div className="w-full bg-black">
                <video
                  controls
                  className="w-full max-h-[720px]"
                  preload="metadata"
                  key={fileUrl}
                >
                  <source src={fileUrl} type={fileType || "video/mp4"} />
                  Your browser does not support the video tag.
                </video>
              </div>
            </TabsContent>
            <TabsContent value="external" className="m-0 p-4">
              <div className="mb-4 flex gap-2">
                <Input
                  placeholder="Paste YouTube or Vimeo URL..."
                  value={externalVideoUrl}
                  onChange={(e) => setExternalVideoUrl(e.target.value)}
                  className="flex-1"
                />
              </div>
              {externalVideoUrl && renderExternalVideo(externalVideoUrl)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  // PDF preview with multiple fallback strategies
  if (type.includes("pdf") || fileUrl?.endsWith(".pdf")) {
    // Build PDF URL with view parameter to prevent download
    const pdfViewUrl = fileUrl?.includes('?') 
      ? `${fileUrl}&view=inline#toolbar=1&navpanes=0` 
      : `${fileUrl}?view=inline#toolbar=1&navpanes=0`;
    
    // Google Docs viewer as fallback (works for public URLs)
    const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl || '')}&embedded=true`;

    return (
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-red-50 to-orange-50 pb-3">
          <CardTitle className="flex items-center gap-2 text-red-800">
            <FileText className="h-5 w-5" />
            PDF Document
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => window.open(fileUrl, '_blank')}
            >
              <Maximize2 className="h-4 w-4" />
              Full Screen
            </Button>
            <DownloadButton />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {pdfError ? (
            <div className="p-8 text-center bg-gray-50">
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">PDF preview is not available in this browser.</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => window.open(fileUrl, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
                <DownloadButton />
              </div>
            </div>
          ) : (
            <div className="w-full h-[720px] bg-gray-100">
              <object
                data={pdfViewUrl}
                type="application/pdf"
                className="w-full h-full"
                onError={() => setPdfError(true)}
              >
                {/* Fallback to iframe if object fails */}
                <iframe
                  title="lesson-pdf"
                  src={pdfViewUrl}
                  className="w-full h-full border-0"
                  key={fileUrl}
                  onError={() => setPdfError(true)}
                />
              </object>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Image preview
  if (type.includes("image") || fileUrl?.match(/\.(png|jpe?g|gif|webp|svg|bmp)$/i)) {
    return (
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 pb-3">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <span className="text-xl">🖼️</span>
            Image
          </CardTitle>
          <DownloadButton />
        </CardHeader>
        <CardContent className="p-4 bg-gray-50">
          <div className="w-full text-center">
            <img 
              src={fileUrl} 
              alt={fileName || "lesson-image"} 
              className="mx-auto max-h-[640px] object-contain rounded-lg shadow-lg" 
              key={fileUrl}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Word document preview
  if (type.includes("word") || type.includes("document") || fileUrl?.match(/\.(docx?|doc)$/i)) {
    return (
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <FileText className="h-5 w-5" />
            Word Document
          </CardTitle>
          <DownloadButton />
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg">
            <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="h-10 w-10 text-blue-500" />
            </div>
            <p className="text-lg font-semibold text-gray-800 mb-2">{fileName || "Document.docx"}</p>
            <p className="text-sm text-gray-500 mb-6">Download to view the full document content</p>
            <Button asChild className="bg-gradient-to-r from-blue-500 to-indigo-500">
              <a href={fileUrl} download={fileName}>
                <Download className="h-4 w-4 mr-2" />
                Download Document
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // PowerPoint preview
  if (type.includes("powerpoint") || type.includes("presentation") || fileUrl?.match(/\.(pptx?|ppt)$/i)) {
    return (
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50 pb-3">
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <span className="text-xl">📊</span>
            Presentation
          </CardTitle>
          <DownloadButton />
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-orange-50 rounded-lg">
            <div className="w-20 h-20 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📊</span>
            </div>
            <p className="text-lg font-semibold text-gray-800 mb-2">{fileName || "Presentation.pptx"}</p>
            <p className="text-sm text-gray-500 mb-6">Download to view the presentation slides</p>
            <Button asChild className="bg-gradient-to-r from-orange-500 to-amber-500">
              <a href={fileUrl} download={fileName}>
                <Download className="h-4 w-4 mr-2" />
                Download Presentation
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Text file preview
  if (type.includes("text") || fileUrl?.match(/\.(txt|md|csv)$/i)) {
    return (
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-gray-50 to-slate-50 pb-3">
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <FileText className="h-5 w-5" />
            Text File
          </CardTitle>
          <DownloadButton />
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full h-[720px] bg-white overflow-auto">
            <iframe
              title="text-file"
              src={fileUrl}
              className="w-full h-full border-0"
              key={fileUrl}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generic fallback
  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-gray-50 to-slate-50 pb-3">
        <CardTitle className="flex items-center gap-2 text-gray-800">
          <FileText className="h-5 w-5" />
          {fileName || "Lesson Material"}
        </CardTitle>
        <DownloadButton />
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-slate-100 rounded-lg">
          <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="h-10 w-10 text-gray-400" />
          </div>
          <p className="text-lg font-semibold text-gray-700 mb-2">Preview Not Available</p>
          <p className="text-sm text-gray-500 mb-6">Download the file to view its contents</p>
          <Button asChild>
            <a href={fileUrl} download={fileName}>
              <Download className="h-4 w-4 mr-2" />
              Download File
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LessonViewer;
