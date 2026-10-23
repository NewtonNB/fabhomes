<?php

namespace App\Console\Commands;

use App\Services\Notifications\NotificationDripService;
use Illuminate\Console\Command;

class RunAutomatedNotificationDrips extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'notifications:run-drips 
                            {--dry-run : Evaluate criteria without dispatching live notifications}
                            {--workflow=all : Target workflow (all, savings, reservations, milestones, dormant)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Evaluate automated notification drip workflows (savings reminders, plot expiry countdown, milestone inspection nudges, dormant re-engagement)';

    /**
     * Execute the console command.
     */
    public function handle(NotificationDripService $dripService): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $workflow = (string) $this->option('workflow');

        $this->info("=======================================================");
        $this->info("   ZIMBANI NOTIFICATION DRIP AUTOMATION ENGINE");
        $this->info("=======================================================");
        $this->info("Execution Mode : " . ($dryRun ? '<comment>DRY RUN (Evaluation only)</comment>' : '<info>LIVE DISPATCH</info>'));
        $this->info("Target Workflow: <comment>{$workflow}</comment>");
        $this->line('');

        $startTime = microtime(true);
        $result = $dripService->runAllDrips($dryRun, $workflow);
        $duration = round(microtime(true) - $startTime, 2);

        $this->info("Workflow Evaluation Summary (in {$duration}s):");
        $this->table(
            ['Metric', 'Count'],
            [
                ['Total Entities Evaluated', $result['summary']['total_evaluated']],
                ['Triggers Dispatched/Created', $result['summary']['total_triggered']],
                ['Skipped (Duplicate / Idempotent)', $result['summary']['total_skipped']],
                ['Evaluation Errors', $result['summary']['total_errors']],
            ]
        );

        $this->line('');
        $this->info("Workflow Breakdown:");

        $breakdownRows = [];
        foreach ($result['breakdown'] as $campaign => $stats) {
            $breakdownRows[] = [
                ucfirst($campaign),
                $stats['evaluated'],
                $stats['triggered'],
                $stats['skipped'],
                $stats['errors'],
            ];
        }

        $this->table(
            ['Campaign', 'Evaluated', 'Triggered', 'Skipped', 'Errors'],
            $breakdownRows
        );

        $this->info("Notification drip automation run completed successfully.");
        return 0;
    }
}
