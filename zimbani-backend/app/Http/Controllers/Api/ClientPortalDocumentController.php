<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ClientDocumentSupportService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientPortalDocumentController extends Controller
{
    protected ClientDocumentSupportService $documentService;

    public function __construct(ClientDocumentSupportService $documentService)
    {
        $this->documentService = $documentService;
    }

    /**
     * Get Client Digital Document Vault
     */
    public function documents(Request $request): JsonResponse
    {
        $filters = $request->only(['document_type', 'search']);
        $data = $this->documentService->getClientDocuments($request->user(), $filters);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Upload File into Vault
     */
    public function uploadDocument(Request $request): JsonResponse
    {
        try {
            $doc = $this->documentService->uploadClientDocument($request->user(), $request);

            return response()->json([
                'success' => true,
                'message' => 'Document uploaded to secure vault successfully.',
                'data' => $doc,
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Generate Comprehensive Account Statement & Ledger
     */
    public function generateStatement(Request $request): JsonResponse
    {
        $filters = $request->only(['account_id', 'from_date', 'to_date']);
        $data = $this->documentService->generateAccountStatement($request->user(), $filters);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Create Support Ticket
     */
    public function createTicket(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'subject' => 'required|string|max:255',
            'message' => 'required|string|min:5|max:3000',
            'category' => 'nullable|string|in:savings_query,plot_reservation,title_deed,construction_snag,payment_issue,general',
            'priority' => 'nullable|string|in:low,medium,high,urgent',
            'project_id' => 'nullable|integer',
            'unit_id' => 'nullable|integer',
            'savings_account_id' => 'nullable|integer',
            'attachments' => 'nullable|array',
        ]);

        try {
            $ticket = $this->documentService->createTicket($request->user(), $validated);

            return response()->json([
                'success' => true,
                'message' => 'Support ticket created successfully. An agent will respond shortly.',
                'data' => $ticket,
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Get Client's Support Tickets
     */
    public function getTickets(Request $request): JsonResponse
    {
        $data = $this->documentService->getClientTickets($request->user());

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Get Detailed Ticket with Messages
     */
    public function getTicketDetails(Request $request, string $identifier): JsonResponse
    {
        try {
            $ticket = $this->documentService->getTicketDetails($request->user(), $identifier);

            return response()->json([
                'success' => true,
                'data' => $ticket,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 404);
        }
    }

    /**
     * Reply to Support Ticket
     */
    public function replyTicket(Request $request, string $identifier): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|min:2|max:3000',
            'attachments' => 'nullable|array',
        ]);

        try {
            $reply = $this->documentService->replyToTicket(
                $request->user(),
                $identifier,
                $validated['message'],
                $validated['attachments'] ?? []
            );

            return response()->json([
                'success' => true,
                'message' => 'Reply posted successfully.',
                'data' => $reply,
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Close Support Ticket
     */
    public function closeTicket(Request $request, string $identifier): JsonResponse
    {
        try {
            $ticket = $this->documentService->closeTicket($request->user(), $identifier);

            return response()->json([
                'success' => true,
                'message' => 'Support ticket marked as resolved/closed.',
                'data' => $ticket,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
