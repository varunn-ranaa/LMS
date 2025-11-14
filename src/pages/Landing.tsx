import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Mail, User, MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import heroImage from "@/assets/library-hero.jpg";
import mentorImage from "@/assets/mentor.jpg";

const Landing = () => {
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      toast.error("Please fill in all fields");
      return;
    }
    toast.success("Thank you for contacting us! We'll get back to you soon.");
    setContactForm({ name: "", email: "", message: "" });
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <span className="text-xl font-heading font-bold">Digital Library</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#home" className="text-foreground/80 hover:text-foreground transition">Home</a>
              <a href="#about" className="text-foreground/80 hover:text-foreground transition">About Us</a>
              <a href="#contact" className="text-foreground/80 hover:text-foreground transition">Contact</a>
              <Link to="/signin">
                <Button variant="outline">Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative py-24 overflow-hidden">
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h1 className="text-5xl md:text-6xl font-heading font-bold mb-6 animate-fade-in">
              Welcome to the Digital Library Portal
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90">
              Your gateway to knowledge — search, borrow, and learn seamlessly.
            </p>
            <Link to="/signin">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 text-lg">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-heading font-bold text-center mb-16">About Us</h2>
          
          {/* Mentor Information */}
          <div className="max-w-4xl mx-auto mb-16">
            <Card className="overflow-hidden">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <img 
                    src={mentorImage} 
                    alt="Mr. Kapil Rajput" 
                    className="w-48 h-48 rounded-full object-cover shadow-lg"
                  />
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-2xl font-heading font-bold mb-2">Mr. Kapil Rajput</h3>
                    <p className="text-muted-foreground font-semibold mb-4">Mentor</p>
                    
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="font-semibold text-foreground">Research Area:</p>
                        <p className="text-muted-foreground">Artificial Intelligence and Machine Learning with a focus on Neural Networks</p>
                      </div>
                      
                      <div>
                        <p className="font-semibold text-foreground">Education:</p>
                        <ul className="text-muted-foreground list-disc list-inside space-y-1">
                          <li>Ph.D. (Pursuing) — Graphic Era University, Dehradun, Uttarakhand</li>
                          <li>M.Tech. (CSE) — Uttaranchal University, Dehradun (2021)</li>
                          <li>B.Tech. (CSE) — Uttar Pradesh Technical University (2009)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Team Section */}
          <div className="max-w-6xl mx-auto">
            <h3 className="text-3xl font-heading font-bold text-center mb-12">Our Team</h3>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { name: "Varun Rana", role: "Team Leader / Backend & Database " },
                { name: "Siddhant Rawat", role: "Backend Developer" },
                { name: "Rishabh Devshali", role: "Frontend Developer" }
              ].map((member) => (
                <Card key={member.name} className="text-center hover:shadow-lg transition">
                  <CardHeader>
                    <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-16 h-16 text-primary" />
                    </div>
                    <CardTitle className="font-heading">{member.name}</CardTitle>
                    <CardDescription>{member.role}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl font-heading font-bold text-center mb-12">Contact Us</h2>
            <Card>
              <CardContent className="p-8">
                <form onSubmit={handleContactSubmit} className="space-y-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Input
                        placeholder="Your full name"
                        className="pl-10"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        className="pl-10"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Message</label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Textarea
                        placeholder="Your message..."
                        className="pl-10 min-h-32"
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full" size="lg">
                    Submit
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">&copy; 2025 Digital Library Portal. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
