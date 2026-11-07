import React from 'react';

interface TextMaskProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  innerClassName?: string;
  children: React.ReactNode;
}

/**
 * Exact replica of jawoo.io's TextMask primitive (module 903005).
 * Wraps content in an overflow-hidden mask with a block-level [data-reveal] child
 * ready for yPercent: 110 -> 0 GSAP animations.
 */
export const TextMask: React.FC<TextMaskProps> = ({
  as: Tag = 'div',
  className = '',
  innerClassName = '',
  children,
  ...rest
}) => {
  return (
    <Tag className={`overflow-hidden ${className}`} {...rest}>
      <span data-reveal="" className={`block ${innerClassName}`}>
        {children}
      </span>
    </Tag>
  );
};
