import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  Users, 
  Mail, 
  Phone, 
  MapPin, 
  Clock,
  Award,
  GraduationCap,
  Building,
  Filter,
  X
} from "lucide-react";
import type { StaffProfile } from "@shared/schema";

export default function StaffDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");

  // Build query parameters
  const queryParams = new URLSearchParams();
  if (searchQuery.trim()) queryParams.set('search', searchQuery.trim());
  if (selectedDepartment) queryParams.set('department', selectedDepartment);

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/api/staff?${queryString}` : '/api/staff';

  const { data: staff = [], isLoading, error } = useQuery<StaffProfile[]>({
    queryKey: ['/api/staff', { search: searchQuery, department: selectedDepartment }],
    queryFn: () => fetch(endpoint).then(res => res.json()),
  });

  // Get unique departments for filtering
  const departments = Array.from(new Set(staff.map(member => member.department))).sort();

  const handleSearchClear = () => {
    setSearchQuery("");
  };

  const handleDepartmentFilter = (dept: string) => {
    setSelectedDepartment(selectedDepartment === dept ? "" : dept);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatExpertise = (expertise: unknown): string[] => {
    if (Array.isArray(expertise)) {
      return expertise as string[];
    }
    return [];
  };

  const formatOfficeHours = (officeHours: unknown): string => {
    if (typeof officeHours === 'object' && officeHours !== null) {
      const hours = officeHours as Record<string, string>;
      return Object.entries(hours).map(([day, time]) => `${day}: ${time}`).join(', ');
    }
    return '';
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Staff Directory</h1>
            <p className="text-red-600">Failed to load staff directory. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-50 py-12">
      <div className="container mx-auto px-4 max-w-7xl">
          {/* Cyan/Sky Theme Header */}
          <div className="bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-500 text-white py-12 mb-8 rounded-2xl shadow-lg" data-testid="staff-header">
            <div className="text-center">
              <div className="flex items-center justify-center gap-4 mb-6">
                <span className="text-6xl">👥</span>
                <h1 className="text-5xl font-bold">
                  Meet Our Team
                </h1>
              </div>
              <p className="text-xl text-cyan-100 max-w-3xl mx-auto">
                Connect with our dedicated educators and professionals who make EduVerse exceptional
              </p>
            </div>
          </div>
          
          <div className="text-center mt-8">
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Get to know the dedicated educators and professionals who make EduVerse a place of excellence, 
              innovation, and inspiring learning experiences.
            </p>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <Card className="p-6 mb-8 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Search Input */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  data-testid="input-search"
                  placeholder="Search by name, title, department, or expertise..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 h-12 text-lg border-gray-200 focus:border-eduverse-blue focus:ring-eduverse-blue/20"
                />
                {searchQuery && (
                  <button
                    data-testid="button-clear-search"
                    onClick={handleSearchClear}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Department Filters */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 text-gray-600">
                <Filter className="h-4 w-4" />
                <span className="font-medium text-sm">Departments:</span>
              </div>
              <Button
                data-testid="filter-all"
                variant={selectedDepartment === "" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDepartment("")}
                className="text-sm"
              >
                All Departments
              </Button>
              {departments.map((dept) => (
                <Button
                  key={dept}
                  data-testid={`filter-${dept.toLowerCase().replace(/\s+/g, '-')}`}
                  variant={selectedDepartment === dept ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDepartmentFilter(dept)}
                  className="text-sm"
                >
                  {dept}
                </Button>
              ))}
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchQuery || selectedDepartment) && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Active filters:</span>
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1">
                    Search: "{searchQuery}"
                    <button onClick={handleSearchClear} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {selectedDepartment && (
                  <Badge variant="secondary" className="gap-1">
                    Department: {selectedDepartment}
                    <button onClick={() => setSelectedDepartment("")} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <div className="animate-pulse">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Results Count */}
        {!isLoading && (
          <div className="mb-6 text-center">
            <p className="text-gray-600">
              {staff.length === 0 
                ? "No staff members found matching your criteria."
                : `Showing ${staff.length} staff member${staff.length !== 1 ? 's' : ''}`
              }
            </p>
          </div>
        )}

        {/* Staff Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {staff.map((member) => (
            <Card 
              key={member.id} 
              data-testid={`card-staff-${member.id}`}
              className="group p-8 bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
            >
              {/* Profile Header */}
              <div className="flex items-start gap-6 mb-6">
                <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
                  <AvatarImage 
                    src={(member as any).imageUrl || ''} 
                    alt={`${member.firstName} ${member.lastName}`} 
                  />
                  <AvatarFallback className="bg-gradient-to-br from-eduverse-blue to-purple-500 text-white text-xl font-bold">
                    {getInitials(member.firstName, member.lastName)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-2xl font-bold text-gray-900 mb-1 group-hover:text-eduverse-blue transition-colors">
                    {member.firstName} {member.lastName}
                  </h3>
                  <p className="text-lg text-eduverse-blue font-medium mb-2">
                    {member.title}
                  </p>
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Building className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{member.department}</span>
                  </div>
                </div>
              </div>

              {/* Bio */}
              {member.bio && (
                <div className="mb-6">
                  <p className="text-gray-700 leading-relaxed line-clamp-3">
                    {member.bio}
                  </p>
                </div>
              )}

              {/* Expertise Tags */}
              {formatExpertise((member as any).expertise).length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <GraduationCap className="h-4 w-4 text-eduverse-blue" />
                    <span className="text-sm font-medium text-gray-700">Areas of Expertise</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formatExpertise((member as any).expertise).slice(0, 4).map((skill, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="text-xs bg-eduverse-light text-eduverse-blue hover:bg-eduverse-blue hover:text-white transition-colors"
                      >
                        {skill}
                      </Badge>
                    ))}
                    {formatExpertise((member as any).expertise).length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{formatExpertise((member as any).expertise).length - 4} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <Separator className="my-6" />

              {/* Contact Information */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-eduverse-blue" />
                  Contact Information
                </h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    <a 
                      href={`mailto:${member.email}`}
                      className="hover:text-eduverse-blue transition-colors"
                      data-testid={`link-email-${member.id}`}
                    >
                      {member.email}
                    </a>
                  </div>
                  
                  {member.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4 flex-shrink-0 text-gray-400" />
                      <a 
                        href={`tel:${member.phone}`}
                        className="hover:text-eduverse-blue transition-colors"
                        data-testid={`link-phone-${member.id}`}
                      >
                        {member.phone}
                      </a>
                    </div>
                  )}
                  
                  {member.officeLocation && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400" />
                      <span>{member.officeLocation}</span>
                    </div>
                  )}
                  
                  {member.officeHours && formatOfficeHours(member.officeHours) && (
                    <div className="flex items-start gap-2 text-gray-600">
                      <Clock className="h-4 w-4 flex-shrink-0 text-gray-400 mt-0.5" />
                      <span className="text-xs">{formatOfficeHours(member.officeHours)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Experience Badge */}
              {(member as any).experience && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Award className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">Experience:</span>
                    <span>{(member as any).experience}</span>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {!isLoading && staff.length === 0 && (
          <div className="text-center py-16">
            <div className="mb-6">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-600 mb-2">
                No staff members found
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                {searchQuery || selectedDepartment 
                  ? "Try adjusting your search criteria or removing filters to see more results."
                  : "Staff profiles will appear here once they are added to the system."
                }
              </p>
            </div>
            {(searchQuery || selectedDepartment) && (
              <div className="space-x-2">
                <Button 
                  variant="outline" 
                  onClick={handleSearchClear}
                  data-testid="button-clear-all-filters"
                >
                  Clear Search
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedDepartment("")}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        )}
    </div>
  );
}
