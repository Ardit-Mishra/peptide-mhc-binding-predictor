import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Clock } from "lucide-react";

export default function RecentActivity() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["/api/recent-activity"],
    queryFn: api.getRecentActivity,
    refetchInterval: 60000, // Refresh every minute
  });

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'sync': return 'bg-primary';
      case 'cache': return 'bg-accent';
      case 'prediction': return 'bg-secondary';
      default: return 'bg-muted';
    }
  };

  return (
    <Card className="card-shadow" data-testid="card-recent-activity">
      <CardContent className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-muted rounded-full mt-2 flex-shrink-0 animate-pulse" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {activities?.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3" data-testid={`activity-${activity.id}`}>
                <div className={`w-2 h-2 ${getActivityColor(activity.type)} rounded-full mt-2 flex-shrink-0`} />
                <div className="text-xs">
                  <div className="text-foreground">{activity.message}</div>
                  <div className="text-muted-foreground">{activity.timestamp}</div>
                </div>
              </div>
            )) || (
              <div className="text-center text-sm text-muted-foreground py-4">
                No recent activity
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
