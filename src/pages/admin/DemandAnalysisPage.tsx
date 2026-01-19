import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import QueueLayout from '@/components/queue/QueueLayout';
import DemandAnalysis from '@/components/admin/DemandAnalysis';

const DemandAnalysisPage = () => {
  const navigate = useNavigate();

  return (
    <QueueLayout 
      title="Demand Analysis & Forecasting"
      subtitle="AI-powered predictions for next week's demand"
    >
      <div className="mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/admin')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
      
      <DemandAnalysis />
    </QueueLayout>
  );
};

export default DemandAnalysisPage;
