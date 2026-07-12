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
    <div style={{ marginLeft: level > 0 ? '16px' : 0, marginBottom: '6px' }}>
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
          padding: '10px 14px',
          borderRadius: 'var(--radius)',
          border: isSelected ? '1px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
          background: isSelected ? 'var(--bg-surface)' : 'var(--bg-card)',
          cursor: (onSelectNode || onSelect) ? 'pointer' : 'default',
          transition: 'var(--transition-fast)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
            >
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span style={{ width: 16, display: 'inline-block' }} />
          )}

          <div style={{ color: isSelected ? 'var(--accent-blue)' : 'var(--text-muted)', display: 'flex' }}>
            {expanded && hasChildren ? <FolderOpen size={16} /> : <Folder size={16} />}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>{node.name}</span>
              <StatusBadge status={node.status} />
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '10px', marginTop: '2px' }}>
              <span>Code: <strong>{node.code}</strong></span>
              {node.head && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <UserCheck size={11} /> Head: {node.head.full_name}
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <Users size={11} /> Employees: {node.employee_count}
              </span>
            </div>
          </div>
        </div>

        {renderNodeActions && (
          <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {renderNodeActions(node)}
          </div>
        )}
      </div>

      {expanded && hasChildren && (
        <div style={{ marginTop: '4px', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '8px', marginLeft: '8px' }}>
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
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No hierarchy nodes established yet.</div>;
  }

  return (
    <div className="tree-view-container">
      {nodes.map((rootNode) => (
        <TreeNodeItem key={rootNode._id} node={rootNode} level={0} renderNodeActions={renderNodeActions} onSelectNode={onSelectNode} onSelect={onSelect} selectedId={selectedId} />
      ))}
    </div>
  );
};
