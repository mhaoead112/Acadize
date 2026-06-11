'use client';
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MascotFloat } from "@/components/MascotFloat";
import { Mail, Phone, MapPin } from "lucide-react";
import { GeometricShapes } from "@/components/GeometricShapes";
const mascotRunning = "/images/mascot-6.png";

const formSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(5, "Phone number is required"),
  schoolName: z.string().min(2, "School name is required"),
  students: z.string().min(1, "Please select number of students"),
  role: z.string().min(1, "Please select your role"),
  message: z.string().optional(),
});

export default function Contact() {
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      schoolName: "",
      students: "",
      role: "",
      message: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    toast({
      title: "Demo Request Received",
      description: "We'll be in touch shortly to schedule your demo.",
    });
    form.reset();
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero */}
      <section className="bg-primary text-white pt-20 pb-24 relative overflow-hidden">
        <GeometricShapes variant="cta" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Let's Get Started
            </h1>
            <p className="text-xl text-blue-100">
              Book a personalized demo to see how Acadize can transform your school's operations and learning experience.
            </p>
          </motion.div>
          <MascotFloat src={mascotRunning} alt="Running Mascot" className="absolute bottom-0 right-10 w-48 lg:w-64 hidden md:block drop-shadow-2xl translate-y-1/4" animation="sway" />
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20 bg-muted/30 flex-1">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-6xl mx-auto">
            
            {/* Form */}
            <div className="lg:col-span-2 bg-card rounded-2xl shadow-sm border border-border p-8">
              <h2 className="text-2xl font-bold text-foreground mb-6">Book Your Demo</h2>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="jane@school.edu" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="schoolName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>School/Institution Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Greenfield Academy" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="students"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Students</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select size" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="under50">Under 50</SelectItem>
                              <SelectItem value="50to200">50 - 200</SelectItem>
                              <SelectItem value="200to500">200 - 500</SelectItem>
                              <SelectItem value="over500">500+</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="principal">Principal/Director</SelectItem>
                              <SelectItem value="admin">Administrator</SelectItem>
                              <SelectItem value="teacher">Teacher</SelectItem>
                              <SelectItem value="it">IT/Tech Staff</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anything specific you'd like to see? (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tell us about your current challenges..." 
                            className="resize-none" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full h-12 text-lg">Book My Demo</Button>
                </form>
              </Form>
            </div>

            {/* Sidebar info */}
            <div className="space-y-8">
              <div className="bg-slate-900 text-white rounded-2xl p-8">
                <h3 className="text-xl font-bold mb-6">Contact Information</h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <Mail className="w-6 h-6 text-accent shrink-0" />
                    <div>
                      <div className="font-medium text-slate-300 text-sm">Email Us</div>
                      <a href="mailto:hello@acadize.com" className="text-lg hover:text-accent transition-colors">hello@acadize.com</a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Phone className="w-6 h-6 text-accent shrink-0" />
                    <div>
                      <div className="font-medium text-slate-300 text-sm">Call Us</div>
                      <a href="tel:+15551234567" className="text-lg hover:text-accent transition-colors">+1 (555) 123-4567</a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <MapPin className="w-6 h-6 text-accent shrink-0" />
                    <div>
                      <div className="font-medium text-slate-300 text-sm">HQ Location</div>
                      <div className="text-lg">San Francisco, CA</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-2xl p-8 shadow-sm border border-border text-center">
                <h3 className="font-bold text-lg mb-2 text-foreground">Want to skip the form?</h3>
                <p className="text-muted-foreground mb-6 text-sm">Pick a time directly on our calendar.</p>
                <Button variant="outline" className="w-full">Schedule Meeting</Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
