import { observer } from 'mobx-react-lite';
import { useEffect, useState, useCallback } from 'react';
import { Button, Input, Popover, PopoverTrigger, PopoverContent } from '@heroui/react';
import { Icon } from '@/components/Common/Iconify/icons';
import { api } from '@/lib/trpc';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RootStore } from '@/store';
import { BlinkoStore } from '@/store/blinkoStore';

interface FolderNode {
  id: number;
  name: string;
  parentId: number | null;
  path: string;
  depth: number;
  sortOrder: number;
  _count: { notes: number };
  children: FolderNode[];
}

function buildTree(folders: any[]): FolderNode[] {
  const map = new Map<number, FolderNode>();
  const roots: FolderNode[] = [];

  for (const f of folders) {
    map.set(f.id, { ...f, children: [] });
  }

  for (const f of folders) {
    const node = map.get(f.id)!;
    if (f.parentId && map.has(f.parentId)) {
      map.get(f.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

const FolderItem = observer(({
  node,
  level,
  activeFolderId,
  onSelect,
  onRefresh,
}: {
  node: FolderNode;
  level: number;
  activeFolderId: number | null;
  onSelect: (id: number | null) => void;
  onRefresh: () => void;
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(level === 0);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const [showMenu, setShowMenu] = useState(false);
  const [isCreatingChild, setIsCreatingChild] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const isActive = activeFolderId === node.id;

  const handleRename = async () => {
    if (renameValue.trim() && renameValue !== node.name) {
      await api.notes.renameFolder.mutate({ id: node.id, name: renameValue.trim() });
      onRefresh();
    }
    setIsRenaming(false);
  };

  const handleDelete = async () => {
    await api.notes.deleteFolder.mutate({ id: node.id });
    if (activeFolderId === node.id) onSelect(null);
    onRefresh();
  };

  const handleCreateChild = async () => {
    if (newFolderName.trim()) {
      await api.notes.createFolder.mutate({ name: newFolderName.trim(), parentId: node.id });
      setNewFolderName('');
      setIsCreatingChild(false);
      setExpanded(true);
      onRefresh();
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer text-sm group/folder
          hover:bg-hover transition-colors
          ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-foreground/70'}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => {
          onSelect(node.id);
          if (node.children.length > 0) setExpanded(!expanded);
        }}
      >
        <button
          className="w-4 h-4 flex items-center justify-center shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {node.children.length > 0 && (
            <Icon
              icon={expanded ? 'mdi:chevron-down' : 'mdi:chevron-right'}
              width="14"
              height="14"
              className="text-foreground/40"
            />
          )}
        </button>

        <Icon
          icon={expanded ? 'mdi:folder-open-outline' : 'mdi:folder-outline'}
          width="16"
          height="16"
          className={isActive ? 'text-primary' : 'text-foreground/50'}
        />

        {isRenaming ? (
          <Input
            size="sm"
            value={renameValue}
            onValueChange={setRenameValue}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setIsRenaming(false);
            }}
            onBlur={handleRename}
            autoFocus
            className="flex-1 min-w-0"
            classNames={{ input: 'text-xs', inputWrapper: 'h-6 min-h-6' }}
          />
        ) : (
          <span className="truncate flex-1 select-none">{node.name}</span>
        )}

        <span className="text-xs text-foreground/30 mr-1">{node._count.notes || ''}</span>

        <Popover isOpen={showMenu} onOpenChange={setShowMenu} placement="bottom-end">
          <PopoverTrigger>
            <button
              className="w-5 h-5 flex items-center justify-center opacity-0 group-hover/folder:opacity-100 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <Icon icon="mdi:dots-horizontal" width="14" height="14" />
            </button>
          </PopoverTrigger>
          <PopoverContent>
            <div className="flex flex-col gap-1 p-1 min-w-[140px]">
              <button
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-hover text-left w-full"
                onClick={() => { setIsCreatingChild(true); setShowMenu(false); }}
              >
                <Icon icon="mdi:folder-plus-outline" width="16" height="16" />
                {t('new-subfolder')}
              </button>
              <button
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-hover text-left w-full"
                onClick={() => { setIsRenaming(true); setShowMenu(false); }}
              >
                <Icon icon="mdi:pencil-outline" width="16" height="16" />
                {t('rename')}
              </button>
              <button
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-hover text-left w-full text-danger"
                onClick={() => { handleDelete(); setShowMenu(false); }}
              >
                <Icon icon="mdi:delete-outline" width="16" height="16" />
                {t('delete')}
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {isCreatingChild && (
        <div className="flex items-center gap-1 px-2 py-1" style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}>
          <Icon icon="mdi:folder-plus-outline" width="14" height="14" className="text-foreground/40 shrink-0" />
          <Input
            size="sm"
            placeholder={t('folder-name')}
            value={newFolderName}
            onValueChange={setNewFolderName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateChild();
              if (e.key === 'Escape') setIsCreatingChild(false);
            }}
            onBlur={() => { if (!newFolderName.trim()) setIsCreatingChild(false); }}
            autoFocus
            className="flex-1 min-w-0"
            classNames={{ input: 'text-xs', inputWrapper: 'h-6 min-h-6' }}
          />
        </div>
      )}

      {expanded && node.children.map((child) => (
        <FolderItem
          key={child.id}
          node={child}
          level={level + 1}
          activeFolderId={activeFolderId}
          onSelect={onSelect}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
});

export const NoteFolderTree = observer(() => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const activeFolderId = searchParams.get('folderId') ? Number(searchParams.get('folderId')) : null;

  const fetchFolders = useCallback(async () => {
    try {
      const result = await api.notes.listFolders.query({});
      setFolders(buildTree(result));
    } catch (e) {
      console.error('Failed to load folders:', e);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const handleSelect = (folderId: number | null) => {
    if (folderId === null) {
      navigate('/');
    } else {
      navigate(`/?path=notes&folderId=${folderId}`);
    }
  };

  const handleCreate = async () => {
    if (newFolderName.trim()) {
      await api.notes.createFolder.mutate({ name: newFolderName.trim() });
      setNewFolderName('');
      setIsCreating(false);
      fetchFolders();
    }
  };

  if (folders.length === 0 && !isCreating) {
    return (
      <div className="mt-4 border-t border-divider pt-3">
        <div className="flex items-center justify-between px-2 mb-1">
          <span className="text-xs font-semibold text-foreground/40 uppercase tracking-wider">{t('folders')}</span>
          <button
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-hover"
            onClick={() => setIsCreating(true)}
          >
            <Icon icon="mdi:plus" width="14" height="14" className="text-foreground/40" />
          </button>
        </div>
        {isCreating && (
          <div className="flex items-center gap-1 px-2 py-1">
            <Icon icon="mdi:folder-plus-outline" width="14" height="14" className="text-foreground/40 shrink-0" />
            <Input
              size="sm"
              placeholder={t('folder-name')}
              value={newFolderName}
              onValueChange={setNewFolderName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') setIsCreating(false);
              }}
              autoFocus
              className="flex-1 min-w-0"
              classNames={{ input: 'text-xs', inputWrapper: 'h-6 min-h-6' }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-divider pt-3">
      <div className="flex items-center justify-between px-2 mb-1">
        <span className="text-xs font-semibold text-foreground/40 uppercase tracking-wider">{t('folders')}</span>
        <button
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-hover"
          onClick={() => setIsCreating(true)}
        >
          <Icon icon="mdi:plus" width="14" height="14" className="text-foreground/40" />
        </button>
      </div>

      {/* All Notes (unfiled) */}
      <div
        className={`flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer text-sm
          hover:bg-hover transition-colors
          ${activeFolderId === null ? 'bg-primary/10 text-primary font-medium' : 'text-foreground/70'}`}
        onClick={() => handleSelect(null)}
      >
        <span className="w-4" />
        <Icon icon="mdi:file-document-multiple-outline" width="16" height="16" className="text-foreground/50" />
        <span className="truncate flex-1 select-none">{t('all-notes')}</span>
      </div>

      {folders.map((node) => (
        <FolderItem
          key={node.id}
          node={node}
          level={0}
          activeFolderId={activeFolderId}
          onSelect={handleSelect}
          onRefresh={fetchFolders}
        />
      ))}

      {isCreating && (
        <div className="flex items-center gap-1 px-2 py-1">
          <Icon icon="mdi:folder-plus-outline" width="14" height="14" className="text-foreground/40 shrink-0" />
          <Input
            size="sm"
            placeholder={t('folder-name')}
            value={newFolderName}
            onValueChange={setNewFolderName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') setIsCreating(false);
            }}
            onBlur={() => { if (!newFolderName.trim()) setIsCreating(false); }}
            autoFocus
            className="flex-1 min-w-0"
            classNames={{ input: 'text-xs', inputWrapper: 'h-6 min-h-6' }}
          />
        </div>
      )}
    </div>
  );
});
