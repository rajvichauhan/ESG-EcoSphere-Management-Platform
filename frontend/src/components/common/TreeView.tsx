import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Users, UserCheck } from 'lucide-react';
import type { TreeNode } from '../../types';
import { StatusBadge } from './StatusBadge';

export interface TreeViewProps {
  nodes: TreeNode[];
  renderNodeActions?: (node: TreeNode) => React.ReactNode;
  onSelectNode?: (node: TreeNode) => void;
  onSelect?: (id: any) => void;
  selectedId?: string | null;
}

const TreeNodeItem: React.FC<{
  node: TreeNode;
  level: number;
  renderNodeActions?: (node: TreeNode) => React.ReactNode;
  onSelectNode?: (node: TreeNode) => void;
  onSelect?: (id: any) => void;
  selectedId?: string | null;
}> = ({ node, level, renderNodeActions, onSelectNode, onSelect, selectedId }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node._id;

  return (
    <div style={{ marginLeft: level > 0 ? `${level * 24}px` : 0, marginBottom: '6px' }}>
      <div
        className="glass-card"
        onClick={() => {
          if (onSelectNode) onSelectNode(node);
          if (onSelect) onSelect(node._id);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderRadius: '12px',
          border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--border-glass)',
          background: isSelected ? 'hsla(var(--hue-primary), 75%, 35%, 0.08)' : 'var(--bg-glass)',
          cursor: (onSelectNode || onSelect) ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
            >
              {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
          ) : (
            <span style={{ width: 18, display: 'inline-block' }} />
          )}

          <div style={{ color: 'var(--color-primary)' }}>{expanded && hasChildren ? <FolderOpen size={18} /> : <Folder size={18} />}</div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)' }}>{node.name}</span>
              <StatusBadge status={node.status} />
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '12px', marginTop: '3px' }}>
              <span>Code: <strong>{node.code}</strong></span>
              {node.head && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <UserCheck size={13} /> Head: {node.head.full_name}
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Users size={13} /> Employees: {node.employee_count}
              </span>
            </div>
          </div>
        </div>

        {renderNodeActions && (
          <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {renderNodeActions(node)}
          </div>
        )}
      </div>

      {expanded && hasChildren && (
        <div style={{ marginTop: '6px', borderLeft: '1px dashed var(--border-glass)', paddingLeft: '8px', marginLeft: '12px' }}>
          {node.children.map((child) => (
            <TreeNodeItem
              key={child._id}
              node={child}
              level={level + 1}
              renderNodeActions={renderNodeActions}
              onSelectNode={onSelectNode}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const TreeView: React.FC<TreeViewProps> = ({ nodes, renderNodeActions, onSelectNode, onSelect, selectedId }) => {
  if (!nodes || nodes.length === 0) {
    return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No hierarchy nodes established yet.</div>;
  }

  return (
    <div className="tree-view-container">
      {nodes.map((rootNode) => (
        <TreeNodeItem key={rootNode._id} node={rootNode} level={0} renderNodeActions={renderNodeActions} onSelectNode={onSelectNode} onSelect={onSelect} selectedId={selectedId} />
      ))}
    </div>
  );
};
