import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
          <h1 className="text-2xl font-semibold text-foreground">Page not found</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            This route is not part of the Peptide–MHC workspace.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
