type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
};

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return <button className={`button ${variant === 'secondary' ? 'secondary' : ''} ${className}`} {...props} />;
}
