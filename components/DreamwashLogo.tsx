interface Props {
  size?: 'sm' | 'md' | 'lg'
}

export default function DreamwashLogo({ size = 'md' }: Props) {
  const fontSize = size === 'sm' ? '1.1rem' : size === 'lg' ? '2.4rem' : '1.5rem'

  return (
    <span style={{ fontFamily: "'Fredoka One', cursive", fontSize, lineHeight: 1, letterSpacing: '0.01em' }}>
      <span style={{ color: '#F73FA4' }}>Dream</span>
      <span style={{ color: '#29B5E8' }}>wash</span>
    </span>
  )
}
