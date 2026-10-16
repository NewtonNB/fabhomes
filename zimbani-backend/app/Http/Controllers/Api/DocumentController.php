<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDocumentRequest;
use App\Http\Requests\UpdateDocumentRequest;
use App\Http\Resources\DocumentResource;
use App\Models\Document;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of documents
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Document::class);

        $query = Document::with(['uploadedBy', 'verifiedBy', 'documentable']);

        // Filter by documentable
        if ($request->filled('documentable_type') && $request->filled('documentable_id')) {
            $type = strtolower($request->documentable_type);
            $modelClass = match ($type) {
                'client' => \App\Models\Client::class,
                'unit' => \App\Models\Unit::class,
                'project' => \App\Models\Project::class,
                'site' => \App\Models\Site::class,
                'payment' => \App\Models\Payment::class,
                'task' => \App\Models\Task::class,
                'equipment' => \App\Models\Equipment::class,
                'site_inspection', 'site_inspections', 'inspection' => \App\Models\SiteInspection::class,
                'punch_list_item', 'punch_list_items', 'defect' => \App\Models\PunchListItem::class,
                'site_daily_log', 'site_daily_logs', 'daily_log', 'daily_logs' => \App\Models\SiteDailyLog::class,
                'safety_incident', 'safety_incidents', 'incident', 'incidents' => \App\Models\SafetyIncident::class,
                'safety_toolbox_talk', 'safety_toolbox_talks', 'toolbox_talk' => \App\Models\SafetyToolboxTalk::class,
                'savings_account', 'savings_accounts', 'account', 'accounts' => \App\Models\SavingsAccount::class,
                'transaction', 'transactions' => \App\Models\Transaction::class,
                'subcontractor_contract', 'subcontractor_contracts', 'contract', 'contracts' => \App\Models\SubcontractorContract::class,
                'payment_certificate', 'payment_certificates', 'certificate', 'certificates' => \App\Models\PaymentCertificate::class,
                default => null,
            };

            if ($modelClass) {
                $id = $request->documentable_id;
                $entity = is_numeric($id) ? $modelClass::find($id) : $modelClass::where('uuid', $id)->first();
                if ($entity) {
                    $query->where('documentable_type', $modelClass)
                          ->where('documentable_id', $entity->id);
                }
            }
        }

        if ($request->filled('document_type')) {
            $query->where('document_type', $request->document_type);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->boolean('verified_only')) {
            $query->where('is_verified', true);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('document_number', 'like', "%{$search}%")
                  ->orWhere('file_name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $sortBy = $request->get('sort_by', 'created_at');
        $sortDirection = $request->get('sort_direction', 'desc');
        $query->orderBy($sortBy, $sortDirection);

        $perPage = $request->get('per_page', 15);
        $documents = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => DocumentResource::collection($documents),
            'meta' => [
                'current_page' => $documents->currentPage(),
                'from' => $documents->firstItem(),
                'last_page' => $documents->lastPage(),
                'per_page' => $documents->perPage(),
                'to' => $documents->lastItem(),
                'total' => $documents->total(),
            ],
        ]);
    }

    /**
     * Store a newly created document with file upload
     */
    public function store(StoreDocumentRequest $request): JsonResponse
    {
        $this->authorize('create', Document::class);

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $mimeType = $file->getClientMimeType() ?: $file->getMimeType();
        $fileSize = $file->getSize();
        $extension = $file->getClientOriginalExtension();

        // Organize uploads by year/month
        $folder = 'documents/' . date('Y/m');
        $filePath = $file->store($folder, 'public');

        $documentable = $request->getDocumentableModel();

        $document = Document::create([
            'title' => $request->input('title'),
            'description' => $request->input('description'),
            'document_type' => $request->input('document_type'),
            'file_path' => $filePath,
            'file_name' => $originalName,
            'mime_type' => $mimeType,
            'file_size' => $fileSize,
            'file_extension' => $extension,
            'documentable_type' => $documentable ? get_class($documentable) : null,
            'documentable_id' => $documentable ? $documentable->id : null,
            'uploaded_by' => auth()->id(),
            'status' => 'active',
            'expiry_date' => $request->input('expiry_date'),
            'metadata' => $request->input('metadata'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Document uploaded successfully',
            'data' => new DocumentResource($document->load(['uploadedBy', 'documentable'])),
        ], 201);
    }

    /**
     * Display the specified document
     */
    public function show(Document $document): JsonResponse
    {
        $this->authorize('view', $document);

        $document->load(['uploadedBy', 'verifiedBy', 'documentable']);

        return response()->json([
            'success' => true,
            'data' => new DocumentResource($document),
        ]);
    }

    /**
     * Update the specified document details
     */
    public function update(UpdateDocumentRequest $request, Document $document): JsonResponse
    {
        $this->authorize('update', $document);

        $document->update($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Document updated successfully',
            'data' => new DocumentResource($document->load(['uploadedBy', 'verifiedBy', 'documentable'])),
        ]);
    }

    /**
     * Remove the specified document
     */
    public function destroy(Document $document): JsonResponse
    {
        $this->authorize('delete', $document);

        $document->delete();

        return response()->json([
            'success' => true,
            'message' => 'Document deleted successfully',
        ]);
    }

    /**
     * Download the document file
     */
    public function download(Document $document): StreamedResponse
    {
        $this->authorize('download', $document);

        if (!Storage::disk('public')->exists($document->file_path)) {
            abort(404, 'File not found on server');
        }

        return Storage::disk('public')->download($document->file_path, $document->file_name);
    }

    /**
     * Verify a document
     */
    public function verify(Document $document): JsonResponse
    {
        $this->authorize('verify', $document);

        $document->verify(auth()->id());

        return response()->json([
            'success' => true,
            'message' => 'Document verified successfully',
            'data' => new DocumentResource($document->load(['uploadedBy', 'verifiedBy', 'documentable'])),
        ]);
    }

    /**
     * Get document statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Document::class);

        $query = Document::query();

        $stats = [
            'total_documents' => (clone $query)->count(),
            'active_documents' => (clone $query)->where('status', 'active')->count(),
            'verified_documents' => (clone $query)->where('is_verified', true)->count(),
            'archived_documents' => (clone $query)->where('status', 'archived')->count(),
            'total_storage_bytes' => (clone $query)->sum('file_size'),
            'by_type' => (clone $query)->select('document_type', DB::raw('count(*) as count'))
                ->groupBy('document_type')
                ->pluck('count', 'document_type'),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}
