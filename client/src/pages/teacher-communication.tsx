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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  Users, 
  Plus, 
  Send,
  Search,
  Filter,
  Pin,
  MoreVertical,
  Reply,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Clock,
  Eye,
  AlertCircle,
  CheckCircle,
  MessageCircle,
  Settings,
  UserPlus,
  Phone,
  Video,
  FileText,
  Paperclip
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Form schemas
const forumPostSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  content: z.string().min(1, "Content is required").max(2000, "Content too long"),
  category: z.string().min(1, "Category is required"),
  tags: z.string().optional(),
  isPinned: z.boolean().default(false),
});

const supportTicketSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200, "Subject too long"),
  description: z.string().min(1, "Description is required").max(1000, "Description too long"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  category: z.string().min(1, "Category is required"),
});

const messageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(500, "Message too long"),
  attachments: z.array(z.string()).optional(),
});

type ForumPostFormData = z.infer<typeof forumPostSchema>;
type SupportTicketFormData = z.infer<typeof supportTicketSchema>;
type MessageFormData = z.infer<typeof messageSchema>;

interface ForumPost {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorAvatar?: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
  replies: number;
  views: number;
  likes: number;
  isPinned: boolean;
  isResolved: boolean;
}

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  createdAt: string;
  updatedAt?: string;
  assignedTo?: string;
  authorName: string;
}

interface GroupChat {
  id: string;
  name: string;
  description?: string;
  type: 'class' | 'subject' | 'project' | 'general';
  memberCount: number;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  isActive: boolean;
}

interface Message {
  id: string;
  content: string;
  authorName: string;
  authorAvatar?: string;
  timestamp: string;
  type: 'text' | 'file' | 'image';
  attachments?: string[];
  isRead: boolean;
}

export default function TeacherCommunication() {
  const [activeTab, setActiveTab] = useState("forums");
  const [isForumPostDialogOpen, setIsForumPostDialogOpen] = useState(false);
  const [isSupportDialogOpen, setIsSupportDialogOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { toast } = useToast();

  // Mock data
  const forumCategories = [
    "General Discussion", "Curriculum Planning", "Technology Tips", 
    "Student Engagement", "Assessment Strategies", "Professional Development"
  ];

  const supportCategories = [
    "Technical Issues", "Account Problems", "Feature Requests", 
    "Billing Questions", "Training Help", "Other"
  ];

  const mockForumPosts: ForumPost[] = [
    {
      id: "1",
      title: "Best practices for remote learning engagement",
      content: "Looking for creative ways to keep students engaged during online classes. What strategies have worked for you?",
      authorName: "Dr. Sarah Wilson",
      category: "Student Engagement",
      tags: ["remote learning", "engagement", "online teaching"],
      createdAt: "2024-01-23T10:30:00Z",
      replies: 12,
      views: 45,
      likes: 8,
      isPinned: true,
      isResolved: false
    },
    {
      id: "2",
      title: "New assessment platform feedback",
      content: "Has anyone tried the new online assessment tools? Would love to hear your experiences and recommendations.",
      authorName: "Prof. Michael Brown",
      category: "Assessment Strategies",
      tags: ["assessment", "technology", "feedback"],
      createdAt: "2024-01-22T14:15:00Z",
      replies: 7,
      views: 23,
      likes: 5,
      isPinned: false,
      isResolved: true
    },
    {
      id: "3",
      title: "Collaborative curriculum planning workshop",
      content: "Organizing a workshop for collaborative curriculum development. Interested teachers please join the discussion.",
      authorName: "Ms. Emily Davis",
      category: "Curriculum Planning",
      tags: ["curriculum", "collaboration", "workshop"],
      createdAt: "2024-01-21T09:45:00Z",
      replies: 15,
      views: 67,
      likes: 12,
      isPinned: false,
      isResolved: false
    }
  ];

  const mockSupportTickets: SupportTicket[] = [
    {
      id: "1",
      subject: "Cannot access gradebook feature",
      description: "The gradebook section is not loading properly. Getting a 500 error when trying to access student grades.",
      status: "in-progress",
      priority: "high",
      category: "Technical Issues",
      createdAt: "2024-01-23T16:20:00Z",
      assignedTo: "Tech Support Team",
      authorName: "Current User"
    },
    {
      id: "2",
      subject: "Request for additional storage space",
      description: "Need more storage for uploading class materials. Current limit is insufficient for video content.",
      status: "open",
      priority: "medium",
      category: "Feature Requests",
      createdAt: "2024-01-22T11:30:00Z",
      authorName: "Current User"
    },
    {
      id: "3",
      subject: "Training session for new features",
      description: "Would like to schedule a training session to learn about the new analytics dashboard.",
      status: "resolved",
      priority: "low",
      category: "Training Help",
      createdAt: "2024-01-20T13:45:00Z",
      updatedAt: "2024-01-22T10:00:00Z",
      assignedTo: "Training Team",
      authorName: "Current User"
    }
  ];

  const mockGroupChats: GroupChat[] = [
    {
      id: "1",
      name: "Mathematics Department",
      description: "All math teachers collaboration space",
      type: "subject",
      memberCount: 8,
      lastMessage: "New curriculum guidelines are available",
      lastMessageAt: "2024-01-23T15:30:00Z",
      unreadCount: 3,
      isActive: true
    },
    {
      id: "2",
      name: "Algebra I - Period 3",
      description: "Class discussion and announcements",
      type: "class",
      memberCount: 28,
      lastMessage: "Reminder: Quiz tomorrow on linear equations",
      lastMessageAt: "2024-01-23T14:45:00Z",
      unreadCount: 0,
      isActive: true
    },
    {
      id: "3",
      name: "Science Fair Planning",
      description: "Organizing the annual science fair",
      type: "project",
      memberCount: 12,
      lastMessage: "Judging criteria document uploaded",
      lastMessageAt: "2024-01-23T12:20:00Z",
      unreadCount: 1,
      isActive: true
    }
  ];

  const mockMessages: Message[] = [
    {
      id: "1",
      content: "Good morning everyone! Hope you all have a great day.",
      authorName: "Dr. Sarah Wilson",
      timestamp: "2024-01-23T08:30:00Z",
      type: "text",
      isRead: true
    },
    {
      id: "2",
      content: "Don't forget about the curriculum meeting this Friday at 3 PM.",
      authorName: "Principal Johnson",
      timestamp: "2024-01-23T09:15:00Z",
      type: "text",
      isRead: true
    },
    {
      id: "3",
      content: "I've uploaded the new lesson plan templates to the shared folder.",
      authorName: "Ms. Emily Davis",
      timestamp: "2024-01-23T10:45:00Z",
      type: "text",
      attachments: ["lesson-plan-template.docx"],
      isRead: false
    }
  ];

  // Form setup
  const forumForm = useForm<ForumPostFormData>({
    resolver: zodResolver(forumPostSchema),
    defaultValues: {
      title: "",
      content: "",
      category: "",
      tags: "",
      isPinned: false,
    },
  });

  const supportForm = useForm<SupportTicketFormData>({
    resolver: zodResolver(supportTicketSchema),
    defaultValues: {
      subject: "",
      description: "",
      priority: "medium",
      category: "",
    },
  });

  const messageForm = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      content: "",
      attachments: [],
    },
  });

  // Mutations
  const createForumPostMutation = useMutation({
    mutationFn: (data: ForumPostFormData) => apiRequest('POST', '/api/forum/posts', data),
    onSuccess: () => {
      toast({ title: "Success", description: "Forum post created successfully!" });
      setIsForumPostDialogOpen(false);
      forumForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create post", variant: "destructive" });
    },
  });

  const createSupportTicketMutation = useMutation({
    mutationFn: (data: SupportTicketFormData) => apiRequest('POST', '/api/support/tickets', data),
    onSuccess: () => {
      toast({ title: "Success", description: "Support ticket created successfully!" });
      setIsSupportDialogOpen(false);
      supportForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create ticket", variant: "destructive" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data: MessageFormData) => apiRequest('POST', '/api/messages', data),
    onSuccess: () => {
      toast({ title: "Success", description: "Message sent!" });
      messageForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to send message", variant: "destructive" });
    },
  });

  const onForumSubmit = (data: ForumPostFormData) => {
    createForumPostMutation.mutate(data);
  };

  const onSupportSubmit = (data: SupportTicketFormData) => {
    createSupportTicketMutation.mutate(data);
  };

  const onMessageSubmit = (data: MessageFormData) => {
    if (selectedChat) {
      sendMessageMutation.mutate(data);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getChatTypeIcon = (type: string) => {
    switch (type) {
      case 'class': return <Users className="h-4 w-4" />;
      case 'subject': return <FileText className="h-4 w-4" />;
      case 'project': return <Settings className="h-4 w-4" />;
      default: return <MessageCircle className="h-4 w-4" />;
    }
  };

  const filteredPosts = mockForumPosts.filter(post => {
    const matchesSearch = searchQuery === "" || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || post.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Communication Hub
            </h1>
            <p className="text-gray-600">
              Collaborate with colleagues and manage communications
            </p>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="forums" data-testid="tab-forums">Teacher Forums</TabsTrigger>
            <TabsTrigger value="group-chats" data-testid="tab-group-chats">Group Chats</TabsTrigger>
            <TabsTrigger value="support" data-testid="tab-support">Support Tickets</TabsTrigger>
          </TabsList>

          <TabsContent value="forums" className="space-y-6">
            {/* Forums Header */}
            <div className="flex justify-between items-center">
              <div className="flex gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search forum posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-forums"
                  />
                </div>
                
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-64" data-testid="select-forum-category">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {forumCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Dialog open={isForumPostDialogOpen} onOpenChange={setIsForumPostDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-forum-post">
                    <Plus className="h-4 w-4 mr-2" />
                    New Post
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Forum Post</DialogTitle>
                    <DialogDescription>
                      Share your question or start a discussion with fellow teachers
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...forumForm}>
                    <form onSubmit={forumForm.handleSubmit(onForumSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={forumForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter post title" {...field} data-testid="input-forum-title" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={forumForm.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-forum-post-category">
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {forumCategories.map((category) => (
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
                        
                        <FormField
                          control={forumForm.control}
                          name="tags"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tags (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="teaching, tips, help" {...field} data-testid="input-forum-tags" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={forumForm.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Content</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Write your post content..." 
                                {...field} 
                                rows={6}
                                data-testid="textarea-forum-content"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => setIsForumPostDialogOpen(false)} data-testid="button-cancel-forum-post">
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createForumPostMutation.isPending} data-testid="button-submit-forum-post">
                          {createForumPostMutation.isPending ? "Creating..." : "Create Post"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Forum Posts */}
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <Card key={post.id} className="hover:shadow-md transition-shadow" data-testid={`forum-post-${post.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {post.authorName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                              {post.title}
                            </h3>
                            {post.isPinned && <Pin className="h-4 w-4 text-blue-600" />}
                            {post.isResolved && <CheckCircle className="h-4 w-4 text-green-600" />}
                          </div>
                          <p className="text-sm text-gray-600">
                            by {post.authorName} • {new Date(post.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" data-testid={`button-forum-menu-${post.id}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>
                            <Reply className="h-4 w-4 mr-2" />
                            Reply
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <ThumbsUp className="h-4 w-4 mr-2" />
                            Like
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Flag className="h-4 w-4 mr-2" />
                            Report
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <p className="text-gray-700 mb-4">
                      {post.content}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary">{post.category}</Badge>
                        {post.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          {post.replies}
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {post.views}
                        </div>
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="h-4 w-4" />
                          {post.likes}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredPosts.length === 0 && (
                <div className="text-center py-8" data-testid="empty-forum-posts">
                  <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No posts found
                  </h3>
                  <p className="text-gray-600">
                    Try adjusting your search or create a new post to start the discussion.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="group-chats" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chat List */}
              <div className="lg:col-span-1">
                <Card data-testid="card-group-chat-list">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Group Chats
                      <Button size="sm" variant="outline" data-testid="button-create-group-chat">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-96">
                      <div className="space-y-2 p-4">
                        {mockGroupChats.map((chat) => (
                          <div 
                            key={chat.id}
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedChat === chat.id 
                                ? 'bg-blue-50 border border-blue-300' 
                                : 'bg-gray-50 hover:bg-gray-100'
                            }`}
                            onClick={() => setSelectedChat(chat.id)}
                            data-testid={`group-chat-${chat.id}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {getChatTypeIcon(chat.type)}
                                <h3 className="font-semibold text-sm">{chat.name}</h3>
                              </div>
                              {chat.unreadCount > 0 && (
                                <Badge variant="destructive" className="h-5 w-5 p-0 text-xs">
                                  {chat.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mb-1">
                              {chat.memberCount} members
                            </p>
                            {chat.lastMessage && (
                              <p className="text-xs text-gray-500 truncate">
                                {chat.lastMessage}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
              
              {/* Chat Window */}
              <div className="lg:col-span-2">
                {selectedChat ? (
                  <Card data-testid="card-chat-window">
                    <CardHeader className="border-b">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {mockGroupChats.find(c => c.id === selectedChat)?.name}
                          </CardTitle>
                          <CardDescription>
                            {mockGroupChats.find(c => c.id === selectedChat)?.memberCount} members
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" data-testid="button-voice-call">
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" data-testid="button-video-call">
                            <Video className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" data-testid="button-chat-settings">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="p-0">
                      <ScrollArea className="h-80 p-4">
                        <div className="space-y-4">
                          {mockMessages.map((message) => (
                            <div key={message.id} className="flex items-start gap-3" data-testid={`message-${message.id}`}>
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {message.authorName.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-semibold">{message.authorName}</span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(message.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700">
                                  {message.content}
                                </p>
                                {message.attachments && (
                                  <div className="mt-2">
                                    {message.attachments.map((attachment, index) => (
                                      <div key={index} className="flex items-center gap-2 text-xs text-blue-600">
                                        <Paperclip className="h-3 w-3" />
                                        {attachment}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      
                      <div className="border-t p-4">
                        <Form {...messageForm}>
                          <form onSubmit={messageForm.handleSubmit(onMessageSubmit)} className="flex gap-2">
                            <FormField
                              control={messageForm.control}
                              name="content"
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormControl>
                                    <Input 
                                      placeholder="Type a message..." 
                                      {...field} 
                                      data-testid="input-chat-message"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <Button type="button" variant="outline" size="sm" data-testid="button-attach-file">
                              <Paperclip className="h-4 w-4" />
                            </Button>
                            <Button type="submit" disabled={sendMessageMutation.isPending} data-testid="button-send-message">
                              <Send className="h-4 w-4" />
                            </Button>
                          </form>
                        </Form>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card data-testid="no-chat-selected">
                    <CardContent className="flex items-center justify-center h-96">
                      <div className="text-center">
                        <MessageCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Select a chat
                        </h3>
                        <p className="text-gray-600">
                          Choose a group chat from the list to start messaging
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="support" className="space-y-6">
            {/* Support Header */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Support Tickets</h2>
                <p className="text-sm text-gray-600">
                  Get help with technical issues and feature requests
                </p>
              </div>
              
              <Dialog open={isSupportDialogOpen} onOpenChange={setIsSupportDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-support-ticket">
                    <Plus className="h-4 w-4 mr-2" />
                    New Ticket
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Support Ticket</DialogTitle>
                    <DialogDescription>
                      Describe your issue and we'll help you resolve it
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...supportForm}>
                    <form onSubmit={supportForm.handleSubmit(onSupportSubmit)} className="space-y-4">
                      <FormField
                        control={supportForm.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject</FormLabel>
                            <FormControl>
                              <Input placeholder="Brief description of the issue" {...field} data-testid="input-support-subject" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={supportForm.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-support-category">
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {supportCategories.map((category) => (
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
                        
                        <FormField
                          control={supportForm.control}
                          name="priority"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Priority</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-support-priority">
                                    <SelectValue placeholder="Select priority" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={supportForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Provide detailed information about your issue..." 
                                {...field} 
                                rows={6}
                                data-testid="textarea-support-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => setIsSupportDialogOpen(false)} data-testid="button-cancel-support-ticket">
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createSupportTicketMutation.isPending} data-testid="button-submit-support-ticket">
                          {createSupportTicketMutation.isPending ? "Creating..." : "Create Ticket"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Support Tickets */}
            <div className="space-y-4">
              {mockSupportTickets.map((ticket) => (
                <Card key={ticket.id} className="hover:shadow-md transition-shadow" data-testid={`support-ticket-${ticket.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            #{ticket.id} - {ticket.subject}
                          </h3>
                          <Badge className={getStatusColor(ticket.status)}>
                            {ticket.status}
                          </Badge>
                          <Badge className={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Category: {ticket.category}
                        </p>
                        <p className="text-gray-700">
                          {ticket.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-4">
                        <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                        {ticket.updatedAt && (
                          <span>Updated: {new Date(ticket.updatedAt).toLocaleDateString()}</span>
                        )}
                        {ticket.assignedTo && (
                          <span>Assigned to: {ticket.assignedTo}</span>
                        )}
                      </div>
                      
                      <Button variant="outline" size="sm" data-testid={`button-view-ticket-${ticket.id}`}>
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {mockSupportTickets.length === 0 && (
                <div className="text-center py-8" data-testid="empty-support-tickets">
                  <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No support tickets
                  </h3>
                  <p className="text-gray-600">
                    Create a new ticket if you need help or have questions.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
