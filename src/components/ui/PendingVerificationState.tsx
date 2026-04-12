import { ShieldAlert, BookOpen, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useUser } from "@/firebase";

export default function PendingVerificationState() {
  const { user } = useUser();

  if (!user) return null;

  return (
    <div className="container mx-auto py-16 px-4 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="max-w-md w-full border-dashed border-2 shadow-sm text-center">
        <CardHeader className="space-y-4 pb-4">
          <div className="mx-auto w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center border-4 border-yellow-500/20">
            <ShieldAlert className="h-8 w-8 text-yellow-500" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-headline">Verification Pending</CardTitle>
            <CardDescription className="text-base">
              Your alumni account is under review
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted pb-0 p-4 rounded-xl text-left space-y-3">
            <p className="text-sm text-muted-foreground flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-500 mt-0.5" />
              <span>We couldn't automatically match your details with our alumni records database.</span>
            </p>
            <p className="text-sm text-muted-foreground flex items-start gap-2">
              <Clock className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
              <span>An administrator has been notified and will manually review your account shortly.</span>
            </p>
            <div className="text-sm text-muted-foreground flex flex-col items-start gap-1 pb-4">
              <span>Once verified, you will instantly gain full access to:</span>
              <ul className="list-disc list-inside mt-1 ml-1 text-foreground space-y-1">
                <li>The Opportunity Feed</li>
                <li>The Alumni Directory</li>
                <li>Student Mentorship & Guidance</li>
                <li>Direct Messaging</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/profile">
                <BookOpen className="h-4 w-4 mr-2" /> Complete Your Profile
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
