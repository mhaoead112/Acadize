import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { 
  FolderOpen, 
  Upload, 
  Search, 
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Star,
  StarOff,
  Share2,
  Tag,
  Calendar,
  FileText,
  Video,
  Image,
  Music,
  Archive,
  Plus,
  Grid,
  List,
  SortAsc,
  MoreVertical
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Form schemas
const uploadFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(500, "Description too long").optional(),
  category: z.string().min(1, "Category is required"),
  subject: z.string().min(1, "Subject is required"),
  gradeLevel: z.string().min(1, "Grade level is required"),
  tags: z.string().optional(),
  isPublic: z.boolean().default(false),
});

const folderFormSchema = z.object({
  name: z.string().min(1, "Folder name is required").max(100, "Name too long"),
  description: z.string().max(300, "Description too long").optional(),
  parentId: z.string().optional(),
});

type UploadFormData = z.infer<typeof uploadFormSchema>;
type FolderFormData = z.infer<typeof folderFormSchema>;

interface ContentItem {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  category: string;
  subject: string;
  gradeLevel: string;
  tags: string[];
  isBookmarked: boolean;
  isPublic: boolean;
  uploadedBy: string;
  uploadedAt: string;
  downloads: number;
  views: number;
  folderId?: string;
}

interface Folder {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  itemCount: number;
  createdAt: string;
}

export default function TeacherContent() {
  const [activeTab, setActiveTab] = useState("my-content");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const { toast } = useToast();

  // Mock data
  const mockCategories = [
    "Lesson Plans", "Worksheets", "Presentations", "Videos", "Audio", 
    "Images", "Assessments", "Handouts", "Templates", "Resources"
  ];

  const mockSubjects = [
    "Mathematics", "Science", "English", "History", "Art", "Music", "PE"
  ];

  const mockGradeLevels = [
    "K-2", "3-5", "6-8", "9-12", "All Grades"
  ];

  const mockFolders: Folder[] = [
    {
      id: "1",
      name: "Algebra I Materials",
      description: "Complete set of Algebra I teaching resources",
      itemCount: 12,
      createdAt: "2024-01-15T00:00:00Z"
    },
    {
      id: "2",
      name: "Biology Lab Experiments",
      description: "Laboratory experiments and procedures",
      itemCount: 8,
      createdAt: "2024-01-20T00:00:00Z"
    },
    {
      id: "3",
      name: "Assessment Templates",
      description: "Reusable assessment templates",
      itemCount: 15,
      createdAt: "2024-01-10T00:00:00Z"
    }
  ];

  const mockContent: ContentItem[] = [
    {
      id: "1",
      title: "Linear Equations Lesson Plan",
      description: "Complete lesson plan for teaching linear equations",
      fileName: "linear-equations-lesson.pdf",
      fileType: "pdf",
      fileSize: 2048000,
      category: "Lesson Plans",
      subject: "Mathematics",
      gradeLevel: "9-12",
      tags: ["algebra", "equations", "graphing"],
      isBookmarked: true,
      isPublic: false,
      uploadedBy: "You",
      uploadedAt: "2024-01-22T00:00:00Z",
      downloads: 45,
      views: 120,
      folderId: "1"
    },
    {
      id: "2",
      title: "Cell Structure Presentation",
      description: "Interactive PowerPoint about cell structure",
      fileName: "cell-structure.pptx",
      fileType: "pptx",
      fileSize: 5120000,
      category: "Presentations",
      subject: "Science",
      gradeLevel: "6-8",
      tags: ["biology", "cells", "microscopy"],
      isBookmarked: false,
      isPublic: true,
      uploadedBy: "You",
      uploadedAt: "2024-01-20T00:00:00Z",
      downloads: 78,
      views: 203,
      folderId: "2"
    },
    {
      id: "3",
      title: "Math Quiz Template",
      description: "Customizable quiz template for math subjects",
      fileName: "math-quiz-template.docx",
      fileType: "docx",
      fileSize: 512000,
      category: "Templates",
      subject: "Mathematics",
      gradeLevel: "All Grades",
      tags: ["quiz", "template", "assessment"],
      isBookmarked: true,
      isPublic: true,
      uploadedBy: "You",
      uploadedAt: "2024-01-18T00:00:00Z",
      downloads: 156,
      views: 321,
      folderId: "3"
    },
    {
      id: "4",
      title: "Photosynthesis Video",
      description: "Educational video explaining photosynthesis process",
      fileName: "photosynthesis-explained.mp4",
      fileType: "mp4",
      fileSize: 25600000,
      category: "Videos",
      subject: "Science",
      gradeLevel: "6-8",
      tags: ["biology", "plants", "education"],
      isBookmarked: false,
      isPublic: false,
      uploadedBy: "You",
      uploadedAt: "2024-01-16T00:00:00Z",
      downloads: 23,
      views: 89,
      folderId: "2"
    }
  ];

  // Shared/Public content
  const mockSharedContent: ContentItem[] = [
    {
      id: "5",
      title: "Scientific Method Poster",
      description: "Visual guide to the scientific method",
      fileName: "scientific-method.png",
      fileType: "png",
      fileSize: 1024000,
      category: "Images",
      subject: "Science",
      gradeLevel: "3-5",
      tags: ["science", "method", "poster"],
      isBookmarked: true,
      isPublic: true,
      uploadedBy: "Dr. Sarah Wilson",
      uploadedAt: "2024-01-21T00:00:00Z",
      downloads: 289,
      views: 567
    },
    {
      id: "6",
      title: "Grammar Rules Cheat Sheet",
      description: "Quick reference for common grammar rules",
      fileName: "grammar-rules.pdf",
      fileType: "pdf",
      fileSize: 768000,
      category: "Handouts",
      subject: "English",
      gradeLevel: "6-8",
      tags: ["grammar", "reference", "english"],
      isBookmarked: false,
      isPublic: true,
      uploadedBy: "Prof. Michael Brown",
      uploadedAt: "2024-01-19T00:00:00Z",
      downloads: 134,
      views: 298
    }
  ];

  // Form setup
  const uploadForm = useForm<UploadFormData>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      subject: "",
      gradeLevel: "",
      tags: "",
      isPublic: false,
    },
  });

  const folderForm = useForm<FolderFormData>({
    resolver: zodResolver(folderFormSchema),
    defaultValues: {
      name: "",
      description: "",
      parentId: "",
    },
  });

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: (data: UploadFormData) => apiRequest('POST', '/api/content/upload', data),
    onSuccess: () => {
      toast({ title: "Success", description: "Content uploaded successfully!" });
      setIsUploadDialogOpen(false);
      uploadForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to upload content", variant: "destructive" });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: (data: FolderFormData) => apiRequest('POST', '/api/content/folders', data),
    onSuccess: () => {
      toast({ title: "Success", description: "Folder created successfully!" });
      setIsFolderDialogOpen(false);
      folderForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create folder", variant: "destructive" });
    },
  });

  const toggleBookmarkMutation = useMutation({
    mutationFn: (contentId: string) => apiRequest('POST', `/api/content/${contentId}/bookmark`),
    onSuccess: () => {
      toast({ title: "Success", description: "Bookmark updated!" });
    },
  });

  const onUploadSubmit = (data: UploadFormData) => {
    uploadMutation.mutate(data);
  };

  const onFolderSubmit = (data: FolderFormData) => {
    createFolderMutation.mutate(data);
  };

  const handleBookmark = (contentId: string) => {
    toggleBookmarkMutation.mutate(contentId);
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
      case 'doc':
      case 'docx':
        return <FileText className="h-6 w-6 text-blue-600" />;
      case 'mp4':
      case 'avi':
      case 'mov':
        return <Video className="h-6 w-6 text-purple-600" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <Image className="h-6 w-6 text-green-600" />;
      case 'mp3':
      case 'wav':
        return <Music className="h-6 w-6 text-orange-600" />;
      default:
        return <Archive className="h-6 w-6 text-gray-600" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / 1048576) + ' MB';
  };

  const filteredContent = mockContent.filter(item => {
    const matchesSearch = searchQuery === "" || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesFolder = selectedFolder === null || item.folderId === selectedFolder;
    
    return matchesSearch && matchesCategory && matchesFolder;
  });

  const filteredSharedContent = mockSharedContent.filter(item => {
    const matchesSearch = searchQuery === "" || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Content Library
            </h1>
            <p className="text-gray-600">
              Organize and manage your teaching materials
            </p>
          </div>
          
          <div className="flex gap-3">
            <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-create-folder">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  New Folder
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Folder</DialogTitle>
                  <DialogDescription>
                    Organize your content with folders
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...folderForm}>
                  <form onSubmit={folderForm.handleSubmit(onFolderSubmit)} className="space-y-4">
                    <FormField
                      control={folderForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Folder Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Algebra Materials" {...field} data-testid="input-folder-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={folderForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Brief description of folder contents" {...field} data-testid="textarea-folder-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => setIsFolderDialogOpen(false)} data-testid="button-cancel-folder">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createFolderMutation.isPending} data-testid="button-submit-folder">
                        {createFolderMutation.isPending ? "Creating..." : "Create Folder"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-upload-content">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Content
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Upload New Content</DialogTitle>
                  <DialogDescription>
                    Add teaching materials to your content library
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...uploadForm}>
                  <form onSubmit={uploadForm.handleSubmit(onUploadSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={uploadForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Math Quiz #1" {...field} data-testid="input-content-title" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={uploadForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-content-category">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {mockCategories.map((category) => (
                                  <SelectItem key={category} value={category}>
                                    {category}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={uploadForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Brief description of the content" {...field} data-testid="textarea-content-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={uploadForm.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-content-subject">
                                  <SelectValue placeholder="Select subject" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {mockSubjects.map((subject) => (
                                  <SelectItem key={subject} value={subject}>
                                    {subject}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={uploadForm.control}
                        name="gradeLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Grade Level</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-content-grade">
                                  <SelectValue placeholder="Select grade level" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {mockGradeLevels.map((grade) => (
                                  <SelectItem key={grade} value={grade}>
                                    {grade}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={uploadForm.control}
                      name="tags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tags (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="math, algebra, equations (comma separated)" {...field} data-testid="input-content-tags" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="space-y-4">
                      <Label>File Upload</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600 mb-2">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-sm text-gray-500">
                          PDF, DOC, PPT, Video, Images (Max 50MB)
                        </p>
                        <Input type="file" className="mt-4" data-testid="input-file-upload" />
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => setIsUploadDialogOpen(false)} data-testid="button-cancel-upload">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={uploadMutation.isPending} data-testid="button-submit-upload">
                        {uploadMutation.isPending ? "Uploading..." : "Upload Content"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-content"
            />
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-category">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {mockCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-sort">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="downloads">Downloads</SelectItem>
              <SelectItem value="views">Views</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              data-testid="button-grid-view"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              data-testid="button-list-view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="my-content" data-testid="tab-my-content">My Content</TabsTrigger>
            <TabsTrigger value="shared" data-testid="tab-shared-content">Shared Resources</TabsTrigger>
            <TabsTrigger value="bookmarks" data-testid="tab-bookmarks">Bookmarks</TabsTrigger>
          </TabsList>

          <TabsContent value="my-content" className="space-y-6">
            {/* Folders */}
            {mockFolders.length > 0 && (
              <Card data-testid="card-folders">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5" />
                    Folders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {mockFolders.map((folder) => (
                      <div 
                        key={folder.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedFolder === folder.id 
                            ? 'bg-blue-50 border-blue-300' 
                            : 'bg-white hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedFolder(selectedFolder === folder.id ? null : folder.id)}
                        data-testid={`folder-${folder.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <FolderOpen className="h-6 w-6 text-blue-600" />
                          <span className="text-sm text-gray-500">{folder.itemCount} items</span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {folder.name}
                        </h3>
                        {folder.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {folder.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Content Grid/List */}
            <Card data-testid="card-content-list">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>
                    {selectedFolder ? `Folder: ${mockFolders.find(f => f.id === selectedFolder)?.name}` : 'All Content'}
                  </CardTitle>
                  {selectedFolder && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedFolder(null)}
                      data-testid="button-clear-folder"
                    >
                      View All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredContent.map((item) => (
                      <div 
                        key={item.id}
                        className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                        data-testid={`content-item-${item.id}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          {getFileIcon(item.fileType)}
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleBookmark(item.id)}
                              data-testid={`button-bookmark-${item.id}`}
                            >
                              {item.isBookmarked ? (
                                <Star className="h-4 w-4 text-yellow-500" />
                              ) : (
                                <StarOff className="h-4 w-4" />
                              )}
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" data-testid={`button-menu-${item.id}`}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Preview
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Share2 className="h-4 w-4 mr-2" />
                                  Share
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                          {item.title}
                        </h3>
                        
                        {item.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-1 mb-3">
                          <Badge variant="secondary" className="text-xs">
                            {item.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {item.subject}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {item.gradeLevel}
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{formatFileSize(item.fileSize)}</span>
                          <span>{item.downloads} downloads</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredContent.map((item) => (
                      <div 
                        key={item.id}
                        className="flex items-center justify-between p-4 bg-white border rounded-lg"
                        data-testid={`content-list-item-${item.id}`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          {getFileIcon(item.fileType)}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {item.title}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>{item.category}</span>
                              <span>{item.subject}</span>
                              <span>{formatFileSize(item.fileSize)}</span>
                              <span>{item.downloads} downloads</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.isBookmarked && <Star className="h-4 w-4 text-yellow-500" />}
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {filteredContent.length === 0 && (
                  <div className="text-center py-8" data-testid="empty-content">
                    <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No content found
                    </h3>
                    <p className="text-gray-600">
                      Try adjusting your search or filters, or upload new content.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shared" className="space-y-6">
            <Card data-testid="card-shared-content">
              <CardHeader>
                <CardTitle>Shared Resources</CardTitle>
                <CardDescription>Content shared by other teachers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredSharedContent.map((item) => (
                    <div 
                      key={item.id}
                      className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                      data-testid={`shared-content-item-${item.id}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        {getFileIcon(item.fileType)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleBookmark(item.id)}
                          data-testid={`button-bookmark-shared-${item.id}`}
                        >
                          {item.isBookmarked ? (
                            <Star className="h-4 w-4 text-yellow-500" />
                          ) : (
                            <StarOff className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                        {item.title}
                      </h3>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        by {item.uploadedBy}
                      </p>
                      
                      {item.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap gap-1 mb-3">
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {item.subject}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-gray-500">
                          {item.downloads} downloads
                        </div>
                        <Button variant="outline" size="sm" data-testid={`button-download-shared-${item.id}`}>
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookmarks" className="space-y-6">
            <Card data-testid="card-bookmarked-content">
              <CardHeader>
                <CardTitle>Bookmarked Content</CardTitle>
                <CardDescription>Your saved content for quick access</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...mockContent, ...mockSharedContent]
                    .filter(item => item.isBookmarked)
                    .map((item) => (
                      <div 
                        key={item.id}
                        className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                        data-testid={`bookmark-item-${item.id}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          {getFileIcon(item.fileType)}
                          <Star className="h-4 w-4 text-yellow-500" />
                        </div>
                        
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                          {item.title}
                        </h3>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          by {item.uploadedBy}
                        </p>
                        
                        <div className="flex flex-wrap gap-1 mb-3">
                          <Badge variant="secondary" className="text-xs">
                            {item.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {item.subject}
                          </Badge>
                        </div>
                        
                        <Button variant="outline" size="sm" className="w-full" data-testid={`button-access-bookmark-${item.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          Access
                        </Button>
                      </div>
                    ))}
                </div>
                
                {[...mockContent, ...mockSharedContent].filter(item => item.isBookmarked).length === 0 && (
                  <div className="text-center py-8" data-testid="empty-bookmarks">
                    <Star className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No bookmarked content
                    </h3>
                    <p className="text-gray-600">
                      Bookmark content to save it for quick access later.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
