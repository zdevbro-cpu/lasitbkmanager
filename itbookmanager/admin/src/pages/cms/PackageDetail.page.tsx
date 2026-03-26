import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { contentService } from '../../services/content.service';
import type { PackageWithItems, ContentItem } from '../../services/content.service';

const CONTENT_TYPE_LABELS: Record<string, string> = { video: '영상', audio: '음성', pdf: 'PDF' };
const CONTENT_TYPE_COLORS: Record<string, string> = {
  video: 'bg-purple-100 text-purple-700',
  audio: 'bg-blue-100 text-blue-700',
  pdf: 'bg-orange-100 text-orange-700',
};

export default function PackageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState<PackageWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemForm, setItemForm] = useState({ title: '', author: '', contentType: 'video', sortOrder: '' });
  const [adding, setAdding] = useState(false);
  const [uploadingItem, setUploadingItem] = useState<ContentItem | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadPackage = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await contentService.getPackage(id);
      setPkg(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadPackage(); }, [id]);

  const handleAddItem = async () => {
    if (!id || !itemForm.title) return;
    setAdding(true);
    try {
      await contentService.addItem(id, {
        title: itemForm.title,
        author: itemForm.author || undefined,
        contentType: itemForm.contentType,
        sortOrder: itemForm.sortOrder ? parseInt(itemForm.sortOrder) : undefined,
      });
      setShowAddItem(false);
      setItemForm({ title: '', author: '', contentType: 'video', sortOrder: '' });
      void loadPackage();
    } catch (e) { alert(String(e)); }
    finally { setAdding(false); }
  };

  const handleUpload = async () => {
    if (!uploadingItem || !uploadFile) return;
    setUploading(true);
    try {
      const { uploadUrl, storagePath } = await contentService.getUploadUrl(
        uploadingItem.id, uploadFile.name, uploadFile.type
      );
      await fetch(uploadUrl, { method: 'PUT', body: uploadFile, headers: { 'Content-Type': uploadFile.type } });
      await contentService.updateItem(uploadingItem.id, {
        storagePath,
        fileSizeBytes: uploadFile.size,
      });
      alert('업로드 완료');
      setUploadingItem(null);
      setUploadFile(null);
      void loadPackage();
    } catch (e) { alert(String(e)); }
    finally { setUploading(false); }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('콘텐츠를 삭제하시겠습니까?')) return;
    try {
      await contentService.deleteItem(itemId);
      void loadPackage();
    } catch (e) { alert(String(e)); }
  };

  const handlePublish = async () => {
    if (!id || !confirm('게시하면 회원에게 배포될 수 있습니다. 게시하시겠습니까?')) return;
    try {
      await contentService.publishPackage(id);
      void loadPackage();
    } catch (e) { alert(String(e)); }
  };

  if (loading) return <div className="text-sm text-gray-400 py-10 text-center">로딩중...</div>;
  if (!pkg) return <div className="text-sm text-gray-400 py-10 text-center">패키지를 찾을 수 없습니다.</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate('/content/packages')} className="text-gray-400 hover:text-gray-600 text-sm">← 목록</button>
        <h2 className="text-xl font-semibold text-gray-900">{pkg.title}</h2>
        <span className="text-sm text-gray-400">Week {pkg.week_number}</span>
        {pkg.is_published
          ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">게시됨</span>
          : <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">미게시</span>
        }
      </div>

      {pkg.description && (
        <p className="text-sm text-gray-500 mb-5">{pkg.description}</p>
      )}

      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium text-gray-900">콘텐츠 목록 ({pkg.items.length}개)</h3>
        <div className="flex gap-2">
          {!pkg.is_published && (
            <button onClick={handlePublish}
              className="px-3 py-1.5 text-sm border border-green-500 text-green-600 rounded-lg hover:bg-green-50">
              게시하기
            </button>
          )}
          <button onClick={() => setShowAddItem(true)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + 콘텐츠 추가
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {pkg.items.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">콘텐츠가 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-10">순서</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">제목</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">저자</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">유형</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">파일</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pkg.items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{item.sort_order}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.title}</td>
                  <td className="px-4 py-3 text-gray-500">{item.author ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CONTENT_TYPE_COLORS[item.content_type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {CONTENT_TYPE_LABELS[item.content_type] ?? item.content_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {item.storage_path
                      ? <span className="text-green-600">업로드됨</span>
                      : <span className="text-orange-500">미업로드</span>
                    }
                    {item.file_size_bytes && ` · ${(item.file_size_bytes / 1024 / 1024).toFixed(1)}MB`}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => setUploadingItem(item)}
                      className="text-xs text-blue-600 hover:underline">업로드</button>
                    <button onClick={() => handleDeleteItem(item.id)}
                      className="text-xs text-red-500 hover:underline">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 콘텐츠 추가 모달 */}
      {showAddItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-4">콘텐츠 추가</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">제목</label>
                <input value={itemForm.title} onChange={e => setItemForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">저자</label>
                <input value={itemForm.author} onChange={e => setItemForm(p => ({ ...p, author: e.target.value }))}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">유형</label>
                <select value={itemForm.contentType} onChange={e => setItemForm(p => ({ ...p, contentType: e.target.value }))}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="video">영상</option>
                  <option value="audio">음성</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">정렬 순서</label>
                <input value={itemForm.sortOrder} onChange={e => setItemForm(p => ({ ...p, sortOrder: e.target.value }))}
                  type="number" placeholder="0" className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAddItem(false)}
                className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700">취소</button>
              <button onClick={handleAddItem} disabled={adding}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm disabled:opacity-50">
                {adding ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 파일 업로드 모달 */}
      {uploadingItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-1">파일 업로드</h3>
            <p className="text-sm text-gray-500 mb-4">{uploadingItem.title}</p>
            <input type="file" onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
              accept={uploadingItem.content_type === 'video' ? 'video/*' : uploadingItem.content_type === 'audio' ? 'audio/*' : 'application/pdf'}
              className="w-full text-sm mb-4" />
            <div className="flex gap-2">
              <button onClick={() => { setUploadingItem(null); setUploadFile(null); }}
                className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700">취소</button>
              <button onClick={handleUpload} disabled={!uploadFile || uploading}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm disabled:opacity-50">
                {uploading ? '업로드 중...' : '업로드'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
