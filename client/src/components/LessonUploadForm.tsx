import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoint } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle, FileUp, Upload, X } from "lucide-react";

interface Course {
  id: string;
  title: string;
  description?: string;
}

interface UploadProgress {
  file: File | null;
  fileName: string;
}

export function LessonUploadForm({ courses = [] }: { courses?: Course[] }) {
  const { token } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [lessonTitle, setLessonTitle] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
    'image/webp'
  ];

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedCourse) {
      newErrors.course = "Please select a course";
    }

    if (!lessonTitle.trim()) {
      newErrors.lessonTitle = "Lesson title is required";
    } else if (lessonTitle.length > 255) {
      newErrors.lessonTitle = "Lesson title must be 255 characters or less";
    }

    if (!selectedFile) {
      newErrors.file = "Please select a file to upload";
    } else if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
      newErrors.file = "File type not allowed. Supported types: PDF, Word, PowerPoint, Images, Text";
    } else if (selectedFile.size > MAX_FILE_SIZE) {
      newErrors.file = "File size exceeds 50MB limit";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      setErrors((prev) => ({ ...prev, file: "" }));
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please check the form for errors",
        variant: "destructive",
      });
      return;
    }

    if (!selectedFile || !token) return;

    setIsLoading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("courseId", selectedCourse);
      formData.append("lessonTitle", lessonTitle);
      formData.append("file", selectedFile);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      });

      // Handle completion
      xhr.addEventListener("load", () => {
        if (xhr.status === 201 || xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          
          const successMsg = `Lesson "${lessonTitle}" uploaded successfully!`;
          setSuccessMessage(successMsg);
          
          toast({
            title: "Success! 🎉",
            description: successMsg,
          });

          // Reset form
          setLessonTitle("");
          setSelectedFile(null);
          setSelectedCourse("");
          setUploadProgress(0);
          setErrors({});
          
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }

          // Clear success message after 5 seconds
          setTimeout(() => setSuccessMessage(""), 5000);
        } else {
          const response = JSON.parse(xhr.responseText);
          throw new Error(response.message || "Upload failed");
        }
      });

      // Handle errors
      xhr.addEventListener("error", () => {
        throw new Error("Network error during upload");
      });

      xhr.open("POST", apiEndpoint("/api/lessons/upload"));
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.send(formData);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to upload lesson";
      toast({
        title: "Upload Failed",
        description: errorMsg,
        variant: "destructive",
      });
      setSuccessMessage("");
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const getFileIcon = () => {
    if (!selectedFile) return <FileUp className="h-4 w-4" />;

    const type = selectedFile.type;
    if (type.includes("pdf")) return "📄";
    if (type.includes("word") || type.includes("document")) return "📝";
    if (type.includes("presentation") || type.includes("powerpoint")) return "📊";
    if (type.includes("image")) return "🖼️";
    if (type.includes("text")) return "📃";
    return "📦";
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-blue-600" />
          Upload Lesson Document
        </CardTitle>
        <CardDescription>
          Upload course materials for your students (PDF, Word, PowerPoint, Images, etc.)
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        {successMessage && (
          <div className="mb-6 flex items-center gap-3 rounded-lg bg-green-50 p-4 border border-green-200">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Course Selection */}
          <div className="space-y-2">
            <Label htmlFor="course" className="font-semibold">
              Select Course *
            </Label>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger
                id="course"
                className={errors.course ? "border-red-500" : ""}
              >
                <SelectValue placeholder="Choose a course..." />
              </SelectTrigger>
              <SelectContent>
                {courses.length > 0 ? (
                  courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="demo-course-1" disabled>
                    Demo Course 1
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.course && (
              <p className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {errors.course}
              </p>
            )}
          </div>

          {/* Lesson Title */}
          <div className="space-y-2">
            <Label htmlFor="lessonTitle" className="font-semibold">
              Lesson Title *
            </Label>
            <Input
              id="lessonTitle"
              type="text"
              placeholder="e.g., Introduction to Algebra, Chapter 5 Summary"
              value={lessonTitle}
              onChange={(e) => {
                setLessonTitle(e.target.value);
                setErrors((prev) => ({ ...prev, lessonTitle: "" }));
              }}
              className={errors.lessonTitle ? "border-red-500" : ""}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">
              {lessonTitle.length}/255 characters
            </p>
            {errors.lessonTitle && (
              <p className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {errors.lessonTitle}
              </p>
            )}
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file" className="font-semibold">
              Document File *
            </Label>
            
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                errors.file
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              onClick={() => !isLoading && fileInputRef.current?.click()}
              onDragOver={(e) => !isLoading && e.preventDefault()}
              onDrop={(e) => {
                if (!isLoading) {
                  e.preventDefault();
                  const files = e.dataTransfer.files;
                  if (files && files.length > 0) {
                    setSelectedFile(files[0]);
                    setErrors((prev) => ({ ...prev, file: "" }));
                  }
                }
              }}
            >
              <input
                ref={fileInputRef}
                id="file"
                type="file"
                onChange={handleFileSelect}
                disabled={isLoading}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.webp"
                className="hidden"
              />

              {selectedFile ? (
                <div className="space-y-2">
                  <div className="text-4xl">{getFileIcon()}</div>
                  <p className="font-semibold text-gray-700">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    Ready to upload
                  </Badge>
                </div>
              ) : (
                <div className="space-y-2">
                  <FileUp className="h-8 w-8 text-gray-400 mx-auto" />
                  <p className="font-semibold text-gray-700">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-sm text-gray-500">
                    PDF, Word, PowerPoint, Images (Max 50MB)
                  </p>
                </div>
              )}
            </div>

            {selectedFile && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                disabled={isLoading}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Remove File
              </Button>
            )}

            {errors.file && (
              <p className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {errors.file}
              </p>
            )}
          </div>

          {/* Progress Bar */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Uploading...</span>
                <span className="font-semibold text-blue-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg transition-all"
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Uploading... ({uploadProgress}%)
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Lesson
              </>
            )}
          </Button>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              <strong>💡 Tip:</strong> Students will be able to download and view these documents from the course page.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
