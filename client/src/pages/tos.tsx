import { motion } from "framer-motion";
import { ChevronLeft, Shield, FileText, Scale, Lock, Users, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const TOS_CATEGORIES = [
  { title: "1. Acceptance of Terms", content: "By accessing or using the Card Vault app, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the service." },
  { title: "2. Vaulty Credits System", content: "Vaulty Credits are a virtual currency used solely within the app. They have no real-world monetary value and cannot be exchanged for fiat currency." },
  { title: "3. Earn Page Rules", content: "Users may post offers on the Earn Page. All offers must be legitimate and adhere to community guidelines. Spam or fraudulent offers will be removed." },
  { title: "4. Posting Limitations", content: "Regular users are limited to 1 post per 24-hour period. Super Admins have unlimited posting privileges." },
  { title: "5. Content Moderation", content: "We reserve the right to remove any content that violates these terms, including but not limited to hate speech, harassment, or illegal activities." },
  { title: "6. User Conduct", content: "You agree not to use the service to harass, abuse, or harm another person or group, or to post false or misleading information." },
  { title: "7. Account Security", content: "You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password." },
  { title: "8. Privacy Policy", content: "Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and share your information." },
  { title: "9. Termination", content: "We may terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms." },
  { title: "10. Changes to Terms", content: "We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our service after those revisions become effective, you agree to be bound by the revised terms." },
  { title: "11. Trading Risks", content: "Trading digital assets involves risk. You acknowledge that you are solely responsible for your trading decisions." },
  { title: "12. Dispute Resolution", content: "Any disputes arising from the use of this service shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association." },
  { title: "13. Intellectual Property", content: "The service and its original content, features, and functionality are and will remain the exclusive property of Card Vault and its licensors." },
  { title: "14. Third-Party Links", content: "Our service may contain links to third-party web sites or services that are not owned or controlled by Card Vault." },
  { title: "15. Disclaimer of Warranties", content: "The service is provided on an 'AS IS' and 'AS AVAILABLE' basis. Card Vault makes no warranties, expressed or implied, regarding the operation of the service." },
  { title: "16. Limitation of Liability", content: "In no event shall Card Vault, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages." },
  { title: "17. Governing Law", content: "These Terms shall be governed and construed in accordance with the laws of Slovenia, without regard to its conflict of law provisions." },
  { title: "18. Feedback", content: "Any feedback, comments, or suggestions you may provide regarding Card Vault is entirely voluntary and we will be free to use such feedback, comments or suggestions as we see fit and without any obligation to you." },
  { title: "19. Copyright Infringement", content: "If you believe that your copyright has been infringed, please contact us with a detailed description of the alleged infringement." },
  { title: "20. Service Availability", content: "We do not guarantee that the service will be available at all times. We may experience hardware, software, or other problems or need to perform maintenance related to the service, resulting in interruptions, delays or errors." },
  { title: "21. User Generated Content", content: "You retain ownership of any content you post, but you grant us a license to use, reproduce, modify, perform, display, distribute and otherwise disclose to third parties any such material." },
  { title: "22. Prohibited Activities", content: "You may not access or use the service for any purpose other than that for which we make the service available." },
  { title: "23. Age Restrictions", content: "The service is intended for users who are at least 13 years old. Persons under the age of 13 are not permitted to use the service." },
  { title: "24. Indemnification", content: "You agree to defend, indemnify and hold us harmless from and against any and all loss, damages, liabilities, claims, or demands, including reasonable attorneys’ fees and expenses." },
  { title: "25. Electronic Communications", content: "Visiting the service, sending us emails, and completing online forms constitute electronic communications. You consent to receive electronic communications." },
  { title: "26. Miscellaneous", content: "These Terms of Service and any policies or operating rules posted by us on the service constitute the entire agreement and understanding between you and us." },
  { title: "27. Contact Information", content: "If you have any questions about these Terms, please contact us at support@cardvault.app." },
  { title: "28. Subscription Services", content: "If you purchase any subscription based service, you agree to pay all applicable fees and taxes." },
  { title: "29. Refund Policy", content: "All sales are final. No refunds will be issued for Vaulty Credits or subscription services, except as required by law." },
  { title: "30. Final Agreement", content: "This agreement supersedes all prior agreements and understandings, whether written or oral, relating to the subject matter of this agreement." }
];

export default function TOSPage() {
  const [location, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10 p-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="text-gray-400 hover:text-white">
          <ChevronLeft size={24} />
        </Button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Scale className="text-cyan-500" /> Terms of Service
        </h1>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-8 text-center space-y-4">
          <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-cyan-500/30">
            <FileText size={32} className="text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold">Card Vault Usage Agreement</h2>
          <p className="text-gray-400 max-w-lg mx-auto">
            Please read these terms carefully before using our services. Your access to and use of the service is conditioned on your acceptance of and compliance with these terms.
          </p>
          <div className="flex justify-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Lock size={12} /> Secure</span>
            <span className="flex items-center gap-1"><Users size={12} /> Community Driven</span>
            <span className="flex items-center gap-1"><Shield size={12} /> Protected</span>
          </div>
        </div>

        <div className="bg-zinc-900/30 border border-white/10 rounded-xl overflow-hidden">
          <Accordion type="single" collapsible className="w-full">
            {TOS_CATEGORIES.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-white/10 px-4">
                <AccordionTrigger className="hover:text-cyan-400 text-left py-4">
                  <span className="font-semibold">{item.title}</span>
                </AccordionTrigger>
                <AccordionContent className="text-gray-400 pb-4 leading-relaxed">
                  {item.content}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="mt-8 p-4 border border-yellow-500/20 bg-yellow-500/5 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-yellow-500 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-semibold text-yellow-500 text-sm">Disclaimer</h4>
            <p className="text-xs text-gray-400 mt-1">
              Card Vault is a prototype application. All "credits" and "assets" are simulated and have no real-world value. Trading involves risk.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
