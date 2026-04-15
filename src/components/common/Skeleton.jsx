/**
 * @component Skeleton
 * @description Animated skeleton loader for SuperAdmin with dark theme integration.
 *              Built on Ant Design Skeleton with custom dark theme styling.
 *
 * Features:
 *   - Dark theme animation (gradient shimmer on dark background)
 *   - Reduce motion support for accessibility
 *   - Semantic variant support
 *   - Smooth loading experience
 *
 * Usage:
 *   <Skeleton />
 *   <Skeleton active paragraph={{ rows: 4 }} />
 *   <Skeleton avatar active />
 *   <Skeleton.Button active size="large" block />
 *   <Skeleton.Input active size="large" />
 */

import React from 'react';
import { Skeleton as AntSkeleton } from 'antd';
import './Skeleton.css';

/**
 * Skeleton component wrapper with dark theme override
 */
const Skeleton = ({
  className = '',
  variant = 'default', // default, list, card, table
  loading = true,
  children,
  ...props
}) => {
  if (!loading) {
    return children || null;
  }

  const variantClass = {
    default: 'skeleton-default',
    list: 'skeleton-list',
    card: 'skeleton-card',
    table: 'skeleton-table',
  }[variant] || '';

  return (
    <AntSkeleton
      className={`skeleton-super-admin ${variantClass} ${className}`}
      {...props}
    />
  );
};

/**
 * Skeleton exports for specific component types
 */
Skeleton.Line = AntSkeleton;
Skeleton.Button = AntSkeleton.Button;
Skeleton.Input = AntSkeleton.Input;
Skeleton.Avatar = AntSkeleton.Avatar;

/**
 * List skeleton variant (shows avatar + multiple lines)
 */
Skeleton.List = (props) => (
  <Skeleton
    avatar
    paragraph={{ rows: 3 }}
    variant="list"
    {...props}
  />
);

/**
 * Card skeleton variant (header + content)
 */
Skeleton.Card = (props) => (
  <AntSkeleton
    className="skeleton-super-admin skeleton-card"
    title={{ width: 100 }}
    paragraph={{ rows: 4 }}
    {...props}
  />
);

/**
 * Table skeleton variant (multiple rows)
 */
Skeleton.Table = (props) => (
  <div className="skeleton-super-admin skeleton-table">
    {[1, 2, 3, 4].map((_, i) => (
      <AntSkeleton
        key={i}
        active
        paragraph={{ rows: 1 }}
        style={{ marginBottom: '12px' }}
      />
    ))}
  </div>
);

export default Skeleton;
