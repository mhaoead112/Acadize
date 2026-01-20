import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import StudentLayout from '@/components/StudentLayout';
import NotificationBell from '@/components/NotificationBell';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiEndpoint } from '@/lib/config';
import { Loader2 } from 'lucide-react';

interface StudentProfile {
    id: string;
    fullName: string;
    username: string;
    email: string;
    phone?: string | null;
    grade?: string | null;
    bio?: string | null;
    profilePicture?: string | null;
    role: string;
    createdAt: string;
}

interface Enrollment {
    courseId: string;
    course: {
        title: string;
    };
}

export default function StudentProfilePage() {
    const [, setLocation] = useLocation();
    const { user, token, getAuthHeaders, updateUser } = useAuth();
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [uploadingPicture, setUploadingPicture] = useState(false);
    const [editForm, setEditForm] = useState({
        fullName: '',
        email: '',
        phone: '',
        grade: '',
        bio: ''
    });

    useEffect(() => {
        if (user) {
            // Parallelize all data fetching
            Promise.all([
                fetchProfileData(),
                fetchEnrollments(),
                fetchAssignments(),
            ]);
        }
    }, [user]);

    const fetchProfileData = async () => {
        try {
            const response = await fetch(apiEndpoint('/api/profile/me'), {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                setProfile(data);
                setEditForm({
                    fullName: data.fullName || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    grade: data.grade || '',
                    bio: data.bio || ''
                });
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEnrollments = async () => {
        try {
            const response = await fetch(apiEndpoint('/api/enrollments/student'), {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                setEnrollments(data);
            }
        } catch (error) {
            console.error('Error fetching enrollments:', error);
        }
    };

    const fetchAssignments = async () => {
        try {
            const response = await fetch(apiEndpoint('/api/assignments/student'), {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                setAssignments(data);
            }
        } catch (error) {
            console.error('Error fetching assignments:', error);
        }
    };

    const handleEditClick = () => {
        if (profile) {
            setEditForm({
                fullName: profile.fullName || '',
                email: profile.email || '',
                phone: profile.phone || '',
                grade: profile.grade || '',
                bio: profile.bio || ''
            });
        }
        setIsEditing(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            const response = await fetch(apiEndpoint('/api/profile/me'), {
                method: 'PUT',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(editForm)
            });

            if (response.ok) {
                const updated = await response.json();
                setProfile(updated);
                setIsEditing(false);
                // Update auth context to refresh sidebar
                updateUser({
                    fullName: updated.fullName,
                    email: updated.email,
                    phone: updated.phone,
                    grade: updated.grade,
                    bio: updated.bio
                });
                toast({
                    title: 'Success',
                    description: 'Profile updated successfully',
                });
            } else {
                throw new Error('Failed to update profile');
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update profile',
                variant: 'destructive'
            });
        }
    };

    const handleProfilePictureChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast({
                title: 'Error',
                description: 'Please select an image file',
                variant: 'destructive'
            });
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: 'Error',
                description: 'Image size must be less than 5MB',
                variant: 'destructive'
            });
            return;
        }

        setUploadingPicture(true);

        try {
            const formData = new FormData();
            formData.append('profilePicture', file);

            const response = await fetch(apiEndpoint('/api/profile/me/picture'), {
                method: 'POST',
                headers: getAuthHeaders(),
                body: formData
            });

            if (response.ok) {
                const updatedProfile = await response.json();
                setProfile(updatedProfile);
                // Update auth context to refresh sidebar
                updateUser({
                    profilePicture: updatedProfile.profilePicture
                });
                toast({
                    title: 'Success',
                    description: 'Profile picture updated successfully',
                });
            } else {
                const error = await response.json();
                toast({
                    title: 'Error',
                    description: error.error || 'Failed to upload picture',
                    variant: 'destructive'
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update profile picture',
                variant: 'destructive'
            });
        } finally {
            setUploadingPicture(false);
        }
    };

    const handleShare = async () => {
        const profileUrl = `${window.location.origin}/student/profile`;
        
        try {
            if (navigator.share) {
                await navigator.share({
                    title: `${profile?.fullName}'s Profile`,
                    text: `Check out ${profile?.fullName}'s student profile`,
                    url: profileUrl
                });
            } else {
                // Fallback: copy to clipboard
                await navigator.clipboard.writeText(profileUrl);
                toast({
                    title: 'Link Copied',
                    description: 'Profile link copied to clipboard',
                });
            }
        } catch (error) {
            // Silent fail or show message
            console.error('Share failed:', error);
        }
    };

    if (loading) {
        return (
            <StudentLayout>
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </StudentLayout>
        );
    }

    if (!profile) {
        return (
            <StudentLayout>
                <div className="flex items-center justify-center h-full">
                    <p className="text-slate-400">Profile not found</p>
                </div>
            </StudentLayout>
        );
    }

    return (
        <StudentLayout>
            <header className="flex items-center justify-between px-8 py-5 border-b border-slate-200 dark:border-navy-border bg-white dark:bg-navy-card backdrop-blur-sm sticky top-0 z-20">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Link href="/student/dashboard" className="hover:text-slate-900 dark:hover:text-white transition-colors">Home</Link>
                    <span className="material-symbols-outlined text-xs">chevron_right</span>
                    <span className="text-slate-900 dark:text-white font-medium">Profile</span>
                </div>
                <div className="flex items-center gap-4">
                    <NotificationBell />
                    <div className="size-9 rounded-full bg-cover bg-center border border-slate-200 dark:border-white/10" 
                         style={{ backgroundImage: profile.profilePicture ? `url("${profile.profilePicture}")` : 'none' }}>
                        {!profile.profilePicture && (
                            <div className="w-full h-full bg-slate-600 rounded-full flex items-center justify-center text-white font-bold">
                                {profile.fullName.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 scroll-smooth bg-slate-50 dark:bg-[#0a192f]">
                <div className="max-w-6xl mx-auto flex flex-col gap-8">
                    {/* Profile Header */}
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between bg-white dark:bg-navy-card p-6 rounded-2xl border border-slate-200 dark:border-navy-border shadow-sm">
                        <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left w-full">
                            <div className="relative group">
                                <div className="size-32 rounded-full bg-cover bg-center border-4 border-primary/20 dark:border-navy-border shadow-lg"
                                     style={{ backgroundImage: profile.profilePicture ? `url("${profile.profilePicture}")` : 'none' }}>
                                    {!profile.profilePicture && (
                                        <div className="w-full h-full bg-slate-600 rounded-full flex items-center justify-center text-white font-bold text-4xl">
                                            {profile.fullName.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    {uploadingPicture && (
                                        <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-white" />
                                        </div>
                                    )}
                                </div>
                                <label htmlFor="profile-picture-upload" className="absolute bottom-1 right-1 bg-primary text-white dark:text-navy-dark rounded-full p-1.5 border-4 border-white dark:border-navy-card shadow-sm hover:scale-110 transition-transform cursor-pointer">
                                    <span className="material-symbols-outlined text-[18px] font-bold">photo_camera</span>
                                    <input 
                                        id="profile-picture-upload"
                                        type="file" 
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleProfilePictureChange}
                                        disabled={uploadingPicture}
                                    />
                                </label>
                            </div>
                            <div className="flex flex-col gap-2 mt-2">
                                <div>
                                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{profile.fullName}</h1>
                                    <p className="text-primary font-bold">{profile.grade || 'Student'}</p>
                                </div>
                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400 mt-1 justify-center sm:justify-start">
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[18px]">school</span>
                                        Class of 2025
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[18px]">id_card</span>
                                        ID: {profile.id.slice(0, 8)}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[18px] text-green-500">check_circle</span>
                                        <span className="text-green-400 font-medium">Active</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
                            <button onClick={handleShare} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-slate-100 dark:bg-navy-dark border border-slate-200 dark:border-navy-border text-slate-900 dark:text-white font-medium hover:bg-slate-200 dark:hover:bg-navy-border transition-colors shadow-sm">
                                <span className="material-symbols-outlined text-[20px]">share</span>
                                <span>Share</span>
                            </button>
                            <button onClick={handleEditClick} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white dark:text-navy-dark font-bold hover:opacity-90 transition-colors shadow-lg shadow-primary/20">
                                <span className="material-symbols-outlined text-[20px] filled">edit</span>
                                <span>Edit Profile</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        {/* Navigation Tabs */}
                        <div className="border-b border-slate-200 dark:border-navy-border">
                            <nav className="flex gap-8 overflow-x-auto no-scrollbar">
                                <button 
                                    onClick={() => setActiveTab('overview')}
                                    className={`pb-4 border-b-2 ${activeTab === 'overview' ? 'border-primary text-slate-900 dark:text-white' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'} font-bold text-sm flex items-center gap-2 transition-colors`}
                                >
                                    Overview
                                </button>
                                <button 
                                    onClick={() => setActiveTab('academic')}
                                    className={`pb-4 border-b-2 ${activeTab === 'academic' ? 'border-primary text-slate-900 dark:text-white' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'} font-medium text-sm flex items-center gap-2 transition-colors`}
                                >
                                    Academic History
                                </button>
                                <button 
                                    onClick={() => setActiveTab('documents')}
                                    className={`pb-4 border-b-2 ${activeTab === 'documents' ? 'border-primary text-slate-900 dark:text-white' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'} font-medium text-sm flex items-center gap-2 transition-colors`}
                                >
                                    Documents
                                </button>
                                <button 
                                    onClick={() => setActiveTab('settings')}
                                    className={`pb-4 border-b-2 ${activeTab === 'settings' ? 'border-primary text-slate-900 dark:text-white' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'} font-medium text-sm flex items-center gap-2 transition-colors`}
                                >
                                    Settings
                                </button>
                            </nav>
                        </div>

                        {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Column */}
                            <div className="lg:col-span-2 flex flex-col gap-6">
                                {/* Personal Info */}
                                <section className="bg-white dark:bg-navy-card rounded-xl border border-slate-200 dark:border-navy-border overflow-hidden shadow-sm">
                                    <div className="px-6 py-4 border-b border-slate-200 dark:border-navy-border flex justify-between items-center bg-slate-50 dark:bg-navy-dark">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary">person</span>
                                            Student Information
                                        </h3>
                                    </div>
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Address</span>
                                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
                                                <span className="material-symbols-outlined text-sm text-slate-400">mail</span>
                                                {profile.email}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone Number</span>
                                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
                                                <span className="material-symbols-outlined text-sm text-slate-400">call</span>
                                                {profile.phone || 'Not provided'}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Username</span>
                                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
                                                <span className="material-symbols-outlined text-sm text-slate-400">badge</span>
                                                {profile.username}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Grade Level</span>
                                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
                                                <span className="material-symbols-outlined text-sm text-slate-400">school</span>
                                                {profile.grade || 'Not specified'}
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 flex flex-col gap-2 pt-4 border-t border-slate-200 dark:border-navy-border">
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bio</span>
                                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
                                                {profile.bio || 'No bio provided yet.'}
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                {/* Enrolled Courses */}
                                <section className="bg-white dark:bg-navy-card rounded-xl border border-slate-200 dark:border-navy-border overflow-hidden shadow-sm">
                                    <div className="px-6 py-4 border-b border-slate-200 dark:border-navy-border bg-slate-50 dark:bg-navy-dark">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary">school</span>
                                            Enrolled Courses
                                        </h3>
                                    </div>
                                    <div className="p-6">
                                        <div className="flex flex-col gap-4">
                                            {enrollments.length > 0 ? (
                                                enrollments.map((enrollment, index) => (
                                                    <div key={enrollment.courseId} className="flex gap-4 items-start bg-slate-50 dark:bg-navy-dark p-4 rounded-lg border border-slate-200 dark:border-navy-border">
                                                        <div className="bg-primary/10 p-2.5 rounded-lg text-primary shrink-0">
                                                            <span className="material-symbols-outlined">book</span>
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="text-slate-900 dark:text-white font-bold text-base">{enrollment.course.title}</h4>
                                                            <p className="text-slate-500 dark:text-slate-400 text-sm">Course {index + 1}</p>
                                                        </div>
                                                        <Link href={`/student/courses/${enrollment.courseId}`}>
                                                            <button className="text-xs font-bold bg-primary/20 text-primary px-3 py-1 rounded hover:bg-primary/30 transition-colors">View</button>
                                                        </Link>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-slate-500 dark:text-slate-400 text-sm">No enrolled courses yet.</p>
                                            )}
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Right Column */}
                            <div className="flex flex-col gap-6">
                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white dark:bg-navy-card p-4 rounded-xl border border-slate-200 dark:border-navy-border flex flex-col items-center justify-center text-center gap-1 hover:border-primary/50 transition-colors shadow-sm">
                                        <span className="text-3xl font-black text-slate-900 dark:text-white">{enrollments.length}</span>
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide">Courses</span>
                                    </div>
                                    <div className="bg-white dark:bg-navy-card p-4 rounded-xl border border-slate-200 dark:border-navy-border flex flex-col items-center justify-center text-center gap-1 hover:border-primary/50 transition-colors shadow-sm">
                                        <span className="text-3xl font-black text-slate-900 dark:text-white">{assignments.length}</span>
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide">Assignments</span>
                                    </div>
                                </div>

                                {/* Today's Schedule */}
                                <section className="bg-white dark:bg-navy-card rounded-xl border border-slate-200 dark:border-navy-border overflow-hidden flex flex-col shadow-sm">
                                    <div className="px-6 py-4 border-b border-slate-200 dark:border-navy-border flex justify-between items-center">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Today's Schedule</h3>
                                        <Link href="/student/calendar" className="text-xs text-primary hover:underline font-bold">View All</Link>
                                    </div>
                                    <div className="p-4 flex flex-col gap-3">
                                        <p className="text-slate-500 dark:text-slate-400 text-sm">No classes scheduled for today.</p>
                                    </div>
                                </section>
                            </div>
                        </div>
                        )}

                        {activeTab === 'academic' && (
                            <div className="bg-white dark:bg-navy-card rounded-xl border border-slate-200 dark:border-navy-border p-6">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Academic History</h3>
                                <p className="text-slate-500 dark:text-slate-400">Academic history and transcripts will be displayed here.</p>
                            </div>
                        )}

                        {activeTab === 'documents' && (
                            <div className="bg-white dark:bg-navy-card rounded-xl border border-slate-200 dark:border-navy-border p-6">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Documents</h3>
                                <p className="text-slate-500 dark:text-slate-400">Your documents and files will be displayed here.</p>
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="bg-white dark:bg-navy-card rounded-xl border border-slate-200 dark:border-navy-border p-6">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Settings</h3>
                                <p className="text-slate-500 dark:text-slate-400">Account settings and preferences will be displayed here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all" onClick={() => setIsEditing(false)}>
                    <div className="bg-white dark:bg-navy-card w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-navy-border overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-navy-border flex justify-between items-center bg-slate-50 dark:bg-navy-dark">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit Profile</h3>
                            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Full Name</label>
                                    <input 
                                        type="text" 
                                        value={editForm.fullName} 
                                        onChange={(e) => setEditForm({...editForm, fullName: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-navy-border rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Grade</label>
                                    <input 
                                        type="text" 
                                        value={editForm.grade} 
                                        onChange={(e) => setEditForm({...editForm, grade: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-navy-border rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Email</label>
                                    <input 
                                        type="email" 
                                        value={editForm.email} 
                                        onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-navy-border rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Phone</label>
                                    <input 
                                        type="text" 
                                        value={editForm.phone} 
                                        onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-navy-border rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Bio</label>
                                    <textarea 
                                        rows={4}
                                        value={editForm.bio} 
                                        onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-navy-border rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none resize-none transition-all"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-200 dark:border-navy-border">
                                <button 
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="px-6 py-2.5 rounded-lg border border-slate-300 dark:border-navy-border text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-navy-dark transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-6 py-2.5 rounded-lg bg-primary text-white dark:text-navy-dark font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </StudentLayout>
    );
}
