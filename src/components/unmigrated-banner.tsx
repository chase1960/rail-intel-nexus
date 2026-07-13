import { AlertTriangle } from 'lucide-react';

export function UnmigratedBanner({ note }: { note?: string }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      <div>
        <div className="font-medium">本页面仍消费本地示例数据（useStore），未接入真实数据库。</div>
        <div className="mt-0.5 text-amber-800/80">
          {note ?? '真实链路：先在「信息源管理」录入来源、在「原文证据库」创建证据；本页面的真实数据接入将在下一轮迭代完成。当前显示的所有数据不会写入 DB。'}
        </div>
      </div>
    </div>
  );
}
