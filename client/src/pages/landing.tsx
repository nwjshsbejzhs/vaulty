import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { motion } from "framer-motion";
import vaultyLogo from "@/assets/vaulty_logo_christmas.png";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState("home");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [chatMessage, setChatMessage] = useState("");
  const [chatResponse, setChatResponse] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);

  const handleGetStarted = () => {
    setLocation("/login");
  };

  const handleScroll = () => {
    const scrollPosition = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    setScrollProgress((scrollPosition / maxScroll) * 100);

    const sections = [
      { id: "home", offset: 0 },
      { id: "about", offset: document.getElementById("about")?.offsetTop || 0 },
      { id: "services", offset: document.getElementById("services")?.offsetTop || 0 },
      { id: "timeline", offset: document.getElementById("timeline")?.offsetTop || 0 },
      { id: "demo", offset: document.getElementById("demo")?.offsetTop || 0 },
      { id: "find-us", offset: document.getElementById("find-us")?.offsetTop || 0 },
    ];

    for (let i = sections.length - 1; i >= 0; i--) {
      if (scrollPosition >= sections[i].offset - 200) {
        setActiveSection(sections[i].id);
        break;
      }
    }
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    
    // Intersection Observer for chat demo
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !chatStarted) {
          setChatStarted(true);
        }
      });
    }, { threshold: 0.3 });

    const demoSection = document.getElementById("demo");
    if (demoSection) {
      observer.observe(demoSection);
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (demoSection) {
        observer.unobserve(demoSection);
      }
    };
  }, [chatStarted]);

  useEffect(() => {
    if (chatStarted && chatMessage === "") {
      // Type user message
      const userMessageText = "Tell me more about crypto";
      let userIndex = 0;
      setIsTyping(true);
      
      const userTimer = setInterval(() => {
        if (userIndex < userMessageText.length) {
          setChatMessage((prev) => userMessageText.substring(0, userIndex + 1));
          userIndex++;
        } else {
          clearInterval(userTimer);
          setIsTyping(false);
          
          // After user message done, wait 1.5s then start AI response
          setTimeout(() => {
            setIsResponding(true);
            const aiResponse = "Cryptocurrency is a digital currency that operates on blockchain technology. Bitcoin, the first cryptocurrency, was created in 2009. There are thousands of cryptocurrencies today, each with unique features. The crypto market is highly volatile, offering both opportunities and risks. Smart investors study market trends and fundamentals before trading.";
            let aiIndex = 0;
            
            const aiTimer = setInterval(() => {
              if (aiIndex < aiResponse.length) {
                setChatResponse((prev) => aiResponse.substring(0, aiIndex + 1));
                aiIndex++;
              } else {
                clearInterval(aiTimer);
                setIsResponding(false);
              }
            }, 30);
          }, 1500);
        }
      }, 50);
      
      return () => clearInterval(userTimer);
    }
  }, [chatStarted]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const navItems = [
    { id: "home", label: "Home" },
    { id: "about", label: "About Us" },
    { id: "services", label: "Services" },
    { id: "find-us", label: "Find Us" },
  ];

  const timelineEvents = [
    { year: "2023", title: "Vaulty AI Founded", description: "Our journey begins with a vision to revolutionize trading" },
    { year: "2024 Q1", title: "Alpha Launch", description: "First users experience AI-powered trading signals" },
    { year: "2024 Q2", title: "Beta Release", description: "Expanded features and improved algorithms" },
    { year: "2024 Q3", title: "1000+ Users", description: "Growing community of successful traders" },
    { year: "2024 Q4", title: "Global Expansion", description: "Now serving traders worldwide" },
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 z-50"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Background effects */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-900/20 rounded-full blur-[100px]" />
      </div>

      {/* Fixed Navigation Bar */}
      <div className="fixed top-3 left-0 right-0 z-50 flex justify-center pointer-events-none px-3">
        <nav className="flex items-center gap-0.5 px-3 py-2 rounded-full backdrop-blur-md border border-white/20 bg-black/60 shadow-lg pointer-events-auto">
          <img src={vaultyLogo} alt="Vaulty" className="w-6 h-6 mr-2" />
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={`px-3 py-1 rounded-full font-semibold text-[11px] whitespace-nowrap transition-all ${
                activeSection === item.id
                  ? "bg-white/20 text-white border border-white/40"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Hero Section */}
      <section id="home" className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-20 text-center">
        <motion.div
          className="max-w-4xl mx-auto space-y-8 pt-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-r from-white via-blue-200 to-purple-300 bg-clip-text text-transparent">
              Your AI Trading Companion
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto">
              Master the markets with intelligent AI insights, real-time analysis, and personalized trading strategies
            </p>
          </motion.div>

          <motion.button
            onClick={handleGetStarted}
            className="inline-flex items-center gap-3 px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-all active:scale-95 group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Get Started Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </motion.button>

          <motion.div
            className="pt-12"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <div className="relative w-full max-w-2xl mx-auto aspect-video rounded-2xl border border-white/10 overflow-hidden backdrop-blur-sm bg-white/5 flex items-center justify-center">
              <p className="text-gray-400">Coming Soon</p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* About Section */}
      <section id="about" className="relative z-10 py-20 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            className="text-4xl md:text-5xl font-bold text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            About Vaulty AI
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <p className="text-gray-300 text-lg leading-relaxed">
                Vaulty AI is a cutting-edge trading platform that combines artificial intelligence with financial expertise to help you make smarter investment decisions.
              </p>
              <p className="text-gray-300 text-lg leading-relaxed">
                Our advanced algorithms analyze market trends, identify opportunities, and provide real-time insights tailored to your trading style and risk preferences.
              </p>
              <p className="text-gray-300 text-lg leading-relaxed">
                Whether you're a beginner or an experienced trader, Vaulty AI gives you the tools and intelligence to succeed in today's dynamic markets.
              </p>
            </motion.div>

            <motion.div
              className="relative h-96 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm flex items-center justify-center"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <p className="text-gray-400">Visual Content Coming Soon</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="relative z-10 py-20 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            className="text-4xl md:text-5xl font-bold text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Our Services
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "AI-Powered Analysis",
                description: "Advanced machine learning algorithms analyze market trends and patterns in real-time"
              },
              {
                title: "Real-Time Signals",
                description: "Get instant notifications and actionable trading signals powered by AI"
              },
              {
                title: "Risk Management",
                description: "Advanced tools to help you manage risk and protect your investments"
              },
              {
                title: "Portfolio Tracking",
                description: "Monitor all your investments in one place with detailed analytics"
              },
              {
                title: "24/7 Monitoring",
                description: "Our AI works round the clock to track global markets"
              },
              {
                title: "Educational Resources",
                description: "Learn from expert insights and tutorials designed for traders"
              }
            ].map((service, idx) => (
              <motion.div
                key={idx}
                className="p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.6 }}
                whileHover={{ y: -5 }}
              >
                <h3 className="text-xl font-bold mb-4 group-hover:text-blue-300 transition-colors">{service.title}</h3>
                <p className="text-gray-400">{service.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section id="timeline" className="relative z-10 py-20 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            className="text-4xl md:text-5xl font-bold text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Our Journey
          </motion.h2>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-500" />

            {/* Timeline events */}
            <div className="space-y-12">
              {timelineEvents.map((event, idx) => (
                <motion.div
                  key={idx}
                  className={`flex ${idx % 2 === 0 ? "flex-row" : "flex-row-reverse"}`}
                  initial={{ opacity: 0, x: idx % 2 === 0 ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1, duration: 0.6 }}
                >
                  <div className="w-1/2 px-8">
                    <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                      <span className="text-blue-400 font-bold text-sm">{event.year}</span>
                      <h3 className="text-xl font-bold mt-2 mb-2">{event.title}</h3>
                      <p className="text-gray-400 text-sm">{event.description}</p>
                    </div>
                  </div>

                  {/* Timeline dot */}
                  <div className="w-4 h-4 bg-white rounded-full absolute left-1/2 transform -translate-x-1/2 -translate-y-2 mt-12 border-4 border-black" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Demo Chat Section */}
      <section id="demo" className="relative z-10 py-20 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            className="text-4xl md:text-5xl font-bold text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Experience Vaulty AI
          </motion.h2>

          <motion.div
            className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            {/* Chat header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <img src={vaultyLogo} alt="Vaulty AI" className="w-8 h-8" />
                <span className="font-bold">Vaulty AI Assistant</span>
              </div>
              <span className="text-xs text-gray-500">Online</span>
            </div>

            {/* Chat messages */}
            <div className="space-y-4 h-64 overflow-y-auto mb-4">
              {/* User message */}
              <motion.div
                className="flex justify-end"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="max-w-xs bg-blue-600 rounded-2xl rounded-tr-none px-4 py-2">
                  <p className="text-sm">{chatMessage}</p>
                  {isTyping && <span className="animate-pulse">▌</span>}
                </div>
              </motion.div>

              {/* AI response */}
              {chatResponse && (
                <motion.div
                  className="flex justify-start"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="max-w-xs bg-white/10 border border-white/20 rounded-2xl rounded-tl-none px-4 py-2">
                    <p className="text-sm text-gray-300">{chatResponse}</p>
                    {isResponding && <span className="animate-pulse">▌</span>}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input placeholder */}
            <div className="p-3 rounded-xl border border-white/10 bg-black/40 text-gray-500 text-sm">
              Type a message...
            </div>
          </motion.div>
        </div>
      </section>

      {/* Find Us Section */}
      <section id="find-us" className="relative z-10 py-20 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            className="text-4xl md:text-5xl font-bold text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Connect With Us
          </motion.h2>

          {/* Social Media */}
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-gray-400 mb-8">Follow us on social media for latest updates</p>
            <div className="flex justify-center gap-6">
              {[
                { icon: Facebook, label: "Facebook", href: "#" },
                { icon: Twitter, label: "Twitter", href: "#" },
                { icon: Instagram, label: "Instagram", href: "#" },
                { icon: Linkedin, label: "LinkedIn", href: "#" },
              ].map((social, idx) => (
                <motion.a
                  key={idx}
                  href={social.href}
                  className="p-4 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 transition-all"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <social.icon className="w-6 h-6" />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Contact Info */}
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "📧 Email", value: "contact@vaulty.ai" },
              { title: "🕐 Support", value: "24/7 Available" },
              { title: "🌍 Location", value: "Global" },
            ].map((contact, idx) => (
              <motion.div
                key={idx}
                className="p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm text-center hover:bg-white/10 transition-all"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <h3 className="text-lg font-bold mb-2">{contact.title}</h3>
                <p className="text-gray-400">{contact.value}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12 px-6 text-center text-gray-500 bg-black/50 backdrop-blur-sm">
        <p>&copy; 2024 Vaulty AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
