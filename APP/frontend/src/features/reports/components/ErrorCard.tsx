import { Card, CardContent } from "@/shared/components/ui/card";

interface ErrorCardProps {
  message: string;
}

export const ErrorCard = ({ message }: ErrorCardProps) => {
  if (!message) return null;

  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="p-4">
        <p className="text-red-600">{message}</p>
      </CardContent>
    </Card>
  );
};
