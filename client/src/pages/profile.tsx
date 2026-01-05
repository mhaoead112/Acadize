import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Camera, User, Mail, Calendar, Loader2, X, Upload } from "lucide-react";
import { apiEndpoint, assetUrl } from '@/lib/config';

interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  profilePicture: string | null;
  grade: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const { toast } = useToast();
  const { updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [grade, setGrade] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("auth_token") || localStorage.getItem("eduverse_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(apiEndpoint("/api/profile/me"), {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setFullName(data.fullName);
        setGrade(data.grade || "");
        if (data.profilePicture) {
          setPreviewImage(assetUrl(data.profilePicture));
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast({
        title: "Error",
        description: "Name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      setUpdating(true);
      const response = await fetch(apiEndpoint("/api/profile/me"), {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fullName, grade: profile?.role === 'student' ? grade : undefined }),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        // Update auth context directly - this updates all components using useAuth
        updateUser({
          fullName: updatedProfile.fullName,
          grade: updatedProfile.grade,
        });
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to update profile",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload immediately
    handleUploadPicture(file);
  };

  const handleUploadPicture = async (file: File) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("profilePicture", file);

      const response = await fetch(apiEndpoint("/api/profile/me/picture"), {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        setPreviewImage(assetUrl(updatedProfile.profilePicture));
        // Update auth context directly - this updates all components using useAuth
        updateUser({
          profilePicture: updatedProfile.profilePicture,
        });
        toast({
          title: "Success",
          description: "Profile picture updated successfully",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to upload picture",
          variant: "destructive",
        });
        // Restore previous image
        if (profile?.profilePicture) {
          setPreviewImage(assetUrl(profile.profilePicture));
        } else {
          setPreviewImage(null);
        }
      }
    } catch (error) {
      console.error("Error uploading picture:", error);
      toast({
        title: "Error",
        description: "Failed to upload picture",
        variant: "destructive",
      });
      // Restore previous image
      if (profile?.profilePicture) {
        setPreviewImage(assetUrl(profile.profilePicture));
      } else {
        setPreviewImage(null);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePicture = async () => {
    try {
      setUploading(true);
      const response = await fetch(apiEndpoint("/api/profile/me/picture"), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        setPreviewImage(null);
        // Update auth context directly - this updates all components using useAuth
        updateUser({
          profilePicture: null,
        });
        toast({
          title: "Success",
          description: "Profile picture removed successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to remove picture",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error removing picture:", error);
      toast({
        title: "Error",
        description: "Failed to remove picture",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="text-center py-10">
          <p className="text-gray-600">Failed to load profile</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-10">
        {/* Elegant Background */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50"></div>
          <div className="absolute top-0 left-0 w-full h-full opacity-20">
            <div className="absolute top-20 right-10 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl animate-float"></div>
            <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl animate-float" style={{ animationDelay: '3s' }}></div>
          </div>
          <div className="absolute inset-0 bg-white/50 backdrop-blur-3xl"></div>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900 font-luxury">Profile Settings</h1>
          <p className="text-gray-600 mt-1 font-elegant">Manage your personal information</p>
        </div>

        {/* Profile Picture Section */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="font-luxury">Profile Picture</CardTitle>
            <CardDescription>Upload or change your profile picture</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-white shadow-xl">
                  <AvatarImage src={previewImage || undefined} />
                  <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {getInitials(profile.fullName)}
                  </AvatarFallback>
                </Avatar>
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex gap-3">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    {previewImage ? "Change Picture" : "Upload Picture"}
                  </Button>

                  {previewImage && (
                    <Button
                      variant="outline"
                      onClick={handleRemovePicture}
                      disabled={uploading}
                      className="gap-2"
                    >
                      <X className="w-4 h-4" />
                      Remove
                    </Button>
                  )}
                </div>

                <p className="text-sm text-gray-600">
                  JPG, PNG, GIF or WEBP. Max size 5MB.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="font-luxury">Personal Information</CardTitle>
            <CardDescription>Update your name and view your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleUpdateName} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="max-w-md"
                />
              </div>

              {profile.role === 'student' && (
                <div className="space-y-2">
                  <Label htmlFor="grade" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Grade Level
                  </Label>
                  <Input
                    id="grade"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="e.g., Grade 10, Year 11, etc."
                    className="max-w-md"
                  />
                </div>
              )}

              {(fullName !== profile.fullName || (profile.role === 'student' && grade !== (profile.grade || ''))) && (
                <div className="flex gap-3">
                  <Button type="submit" disabled={updating}>
                    {updating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFullName(profile.fullName);
                      setGrade(profile.grade || '');
                    }}
                    disabled={updating}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </form>

            <div className="border-t pt-6 space-y-4">
              <div className="flex items-center gap-3 text-gray-700">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="font-medium">{profile.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-700">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Username</p>
                  <p className="font-medium">{profile.username}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-700">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Member Since</p>
                  <p className="font-medium">{formatDate(profile.createdAt)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-700">
                <div className="w-5 h-5 flex items-center justify-center">
                  <span className="text-sm font-bold text-gray-400">R</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Role</p>
                  <p className="font-medium capitalize">{profile.role}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
