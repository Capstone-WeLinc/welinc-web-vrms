type LegacyButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
};

export function LegacyButton({ variant = 'primary', className = '', ...props }: LegacyButtonProps) {
  return <button className={`button ${variant === 'secondary' ? 'secondary' : ''} ${className}`} {...props} />;
}
