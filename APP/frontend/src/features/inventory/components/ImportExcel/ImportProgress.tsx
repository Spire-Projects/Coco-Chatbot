import { Progress } from '@/shared/components/ui/progress';

interface ImportProgressProps {
  progress: number;
}

export const ImportProgress = ({ progress }: ImportProgressProps) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Importando productos...</span>
        <span className="font-medium">{progress}%</span>
      </div>
      <Progress value={progress} />
    </div>
  );
};
