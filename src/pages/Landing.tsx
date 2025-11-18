import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Mail, MessageSquare, Github, Linkedin, Calendar, Code, Database, Palette, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import heroImage from "@/assets/library-hero.jpg";
import mentorImage from "@/assets/mymentor.jpg";
import varunPhoto from "@/assets/varun.jpeg";
import siddhantPhoto from "@/assets/siddhant.jpeg";
import rishabhPhoto from "@/assets/rishabh.jpeg";

const Landing = () => {
  const [feedbackForm, setFeedbackForm] = useState({ 
    name: "", 
    email: "", 
    message: "",
    rating: 0 
  });
  const [imageLoaded, setImageLoaded] = useState({
    varun: false,
    siddhant: false,
    rishabh: false,
    mentor: false
  });

  // Smooth scroll function
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackForm.name || !feedbackForm.email || !feedbackForm.message) {
      toast.error("Please fill in all fields");
      return;
    }
    if (feedbackForm.rating === 0) {
      toast.error("Please provide a rating");
      return;
    }
    toast.success("Thank you for your feedback! We appreciate your input.");
    setFeedbackForm({ name: "", email: "", message: "", rating: 0 });
  };

  const handleRatingClick = (rating: number) => {
    setFeedbackForm({ ...feedbackForm, rating });
  };

  const handleImageLoad = (member: string) => {
    setImageLoaded(prev => ({ ...prev, [member]: true }));
  };

  const handleImageError = (member: string) => {
    setImageLoaded(prev => ({ ...prev, [member]: false }));
  };

  const teamMembers = [
    { 
      name: "Varun Rana", 
      role: "Team Leader",
      specialization: "Backend & Database",
      photo: varunPhoto,
      description: "Leads the team and handles backend architecture and database design",
      skills: ["Node.js", "PostgreSQL", "Supabase", "API Design"],
      github: "https://github.com/varunn-ranaa",
      linkedin: "https://www.linkedin.com/in/varun-rana-6a7560324",
      email: "varunrana1789@gmail.com",
      icon: <Database className="w-6 h-6" />
    },
    { 
      name: "Siddhant Rawat", 
      role: "Backend Developer",
      specialization: "API Development",
       photo: siddhantPhoto,
      description: "Builds robust APIs and server logic with focus on performance",
      skills: ["Express.js", "REST APIs", "Authentication", "Testing"],
      github: "https://github.com/siddhantrawat",
      linkedin: "https://linkedin.com/in/siddhantrawat",
      email: "rawatsiddhant234@gmail.com",
      icon: <Code className="w-6 h-6" />
    },
    { 
      name: "Rishabh Devshali", 
      role: "Frontend Developer", 
      specialization: "UI/UX Design",
      photo: rishabhPhoto,
      description: "Creates beautiful and responsive user interfaces with modern design",
      skills: ["React", "TypeScript", "Tailwind CSS", "Figma"],
      github: "https://github.com/rishabhdevshali",
      linkedin: "https://linkedin.com/in/rishabhdevshali",
      email: "rishabh.devshali@example.com",
      icon: <Palette className="w-6 h-6" />
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <span className="text-xl font-heading font-bold">Visual Library</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <button 
                onClick={() => scrollToSection('home')}
                className="text-foreground/80 hover:text-foreground transition"
              >
                Home
              </button>
              <button 
                onClick={() => scrollToSection('about')}
                className="text-foreground/80 hover:text-foreground transition"
              >
                About Us
              </button>
              <button 
                onClick={() => scrollToSection('team')}
                className="text-foreground/80 hover:text-foreground transition"
              >
                Our Team
              </button>
              <button 
                onClick={() => scrollToSection('feedback')}
                className="text-foreground/80 hover:text-foreground transition"
              >
                Feedback
              </button>
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
              Welcome to the Visual Library Portal
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
          <div className="max-w-4xl mx-auto mb-20">
            <Card className="overflow-hidden border-2 border-primary/20 hover:border-primary/40 transition-all duration-300">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="relative">
                    <img 
                      src={mentorImage} 
                      alt="Mr. Kapil Rajput" 
                      className="w-48 h-48 rounded-full object-cover shadow-lg"
                      onLoad={() => handleImageLoad("mentor")}
                    />
                    <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-2 shadow-lg">
                      <Calendar className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-2xl font-heading font-bold mb-2">Mr. Kapil Rajput</h3>
                    <p className="text-muted-foreground font-semibold mb-4">Mentor & Guide</p>
                    
                    <div className="space-y-4 text-sm">
                      <div>
                        <p className="font-semibold text-foreground mb-1">Research Area:</p>
                        <p className="text-muted-foreground">Artificial Intelligence and Machine Learning with a focus on Neural Networks</p>
                      </div>
                      
                      <div>
                        <p className="font-semibold text-foreground mb-2">Education:</p>
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
        </div>
      </section>

      {/* Team Section */}
      <section id="team" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-3xl font-heading font-bold text-center mb-4">Meet Our Team</h3>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              Passionate developers working together to build the best visual library experience
            </p>
            
            <div className="grid md:grid-cols-3 gap-8">
              {teamMembers.map((member) => (
                <Card key={member.name} className="text-center hover:shadow-xl transition-all duration-300 hover:translate-y-2 group">
                  <CardHeader className="pb-4">
                    <div className="relative mx-auto mb-4">
                      <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-primary/20 shadow-lg group-hover:border-primary/40 transition-colors duration-300 relative">
                        {member.photo ? (
                          <>
                            <img 
                              src={member.photo} 
                              alt={member.name}
                              className={`w-full h-full object-cover group-hover:scale-110 transition duration-300 ${
                                imageLoaded[member.name.toLowerCase().split(' ')[0] as keyof typeof imageLoaded] 
                                  ? 'opacity-100' 
                                  : 'opacity-0'
                              }`}
                              onLoad={() => handleImageLoad(member.name.toLowerCase().split(' ')[0])}
                              onError={() => handleImageError(member.name.toLowerCase().split(' ')[0])}
                            />
                            {!imageLoaded[member.name.toLowerCase().split(' ')[0] as keyof typeof imageLoaded] && (
                              <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                                {member.icon}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted/50">
                            {member.icon}
                          </div>
                        )}
                      </div>
                    </div>
                    <CardTitle className="font-heading text-xl">{member.name}</CardTitle>
                    <CardDescription className="font-semibold text-primary">{member.role}</CardDescription>
                    <p className="text-sm text-muted-foreground mt-2">{member.specialization}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{member.description}</p>
                    
                    {/* Skills */}
                    <div className="flex flex-wrap gap-2 justify-center mb-4">
                      {member.skills.map((skill) => (
                        <span 
                          key={skill}
                          className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                    
                    {/* Social Links */}
                    <div className="flex justify-center gap-3">
                      <a 
                        href={member.github} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
                        title="GitHub"
                      >
                        <Github className="w-4 h-4" />
                      </a>
                      <a 
                        href={member.linkedin} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="LinkedIn"
                      >
                        <Linkedin className="w-4 h-4" />
                      </a>
                      <a 
                        href={`mailto:${member.email}`}
                        className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title="Email"
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feedback Section */}
      <section id="feedback" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-heading font-bold mb-4">Share Your Feedback</h2>
            <p className="text-muted-foreground text-lg mb-12 max-w-2xl mx-auto">
              We value your opinion! Help us improve our visual library by sharing your thoughts and suggestions.
            </p>
            
            {/* Feedback Form */}
            <Card className="max-w-2xl mx-auto">
              <CardContent className="p-8">
                <h3 className="text-2xl font-heading font-bold mb-6">Tell Us What You Think</h3>
                <form onSubmit={handleFeedbackSubmit} className="space-y-6">
                  {/* Rating System */}
                  <div className="text-center">
                    <p className="text-sm font-medium mb-4">How would you rate your experience?</p>
                    <div className="flex justify-center gap-2 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleRatingClick(star)}
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-8 h-8 ${
                              star <= feedbackForm.rating
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {feedbackForm.rating === 0 ? "Select a rating" : `${feedbackForm.rating} out of 5 stars`}
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Input
                        placeholder="Your full name"
                        value={feedbackForm.name}
                        onChange={(e) => setFeedbackForm({ ...feedbackForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={feedbackForm.email}
                        onChange={(e) => setFeedbackForm({ ...feedbackForm, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <Textarea
                    placeholder="What did you like? What can we improve? Any suggestions?"
                    className="min-h-32"
                    value={feedbackForm.message}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })}
                  />
                  <Button type="submit" className="w-full" size="lg">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Submit Feedback
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-8 w-8" />
                <span className="text-xl font-heading font-bold">Visual Library</span>
              </div>
              <p className="text-primary-foreground/80 text-sm">
                Your gateway to knowledge and learning. Built with modern technology and passion.
              </p>
            </div>
            
            <div>
              <h4 className="font-heading font-semibold mb-4">Quick Links</h4>
              <div className="space-y-2 text-sm">
                <button 
                  onClick={() => scrollToSection('home')}
                  className="block text-primary-foreground/80 hover:text-white transition text-left"
                >
                  Home
                </button>
                <button 
                  onClick={() => scrollToSection('about')}
                  className="block text-primary-foreground/80 hover:text-white transition text-left"
                >
                  About
                </button>
                <button 
                  onClick={() => scrollToSection('team')}
                  className="block text-primary-foreground/80 hover:text-white transition text-left"
                >
                  Our Team
                </button>
                <button 
                  onClick={() => scrollToSection('feedback')}
                  className="block text-primary-foreground/80 hover:text-white transition text-left"
                >
                  Feedback
                </button>
              </div>
            </div>
            
            <div>
              <h4 className="font-heading font-semibold mb-4">Connect</h4>
              <div className="space-y-2 text-sm">
                <a href="#" className="block text-primary-foreground/80 hover:text-white transition">GitHub</a>
                <a href="#" className="block text-primary-foreground/80 hover:text-white transition">LinkedIn</a>
                <a href="#" className="block text-primary-foreground/80 hover:text-white transition">Twitter</a>
              </div>
            </div>
            
            <div>
              <h4 className="font-heading font-semibold mb-4">Legal</h4>
              <div className="space-y-2 text-sm">
                <a href="#" className="block text-primary-foreground/80 hover:text-white transition">Privacy Policy</a>
                <a href="#" className="block text-primary-foreground/80 hover:text-white transition">Terms of Service</a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-primary-foreground/20 pt-8 text-center">
            <p className="text-sm text-primary-foreground/80">
              &copy; 2025 Visual Library Portal. All rights reserved. Built with ❤️ by our team.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;