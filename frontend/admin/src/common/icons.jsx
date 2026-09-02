import { LayoutGrid, Package, MessageSquareText, Users, Wallet, Building2, Settings, BadgeCheck, Image } from 'lucide-react'

export const IconDashboard = ({ className = 'w-5 h-5' }) => <LayoutGrid className={className} />

export const IconBox = ({ className = 'w-5 h-5' }) => <Package className={className} />

export const IconSurvey = ({ className = 'w-5 h-5' }) => <MessageSquareText className={className} />

export const IconUsers = ({ className = 'w-5 h-5' }) => <Users className={className} />

export const IconWallet = ({ className = 'w-5 h-5' }) => <Wallet className={className} />

export const IconSponsor = ({ className = 'w-5 h-5' }) => <Building2 className={className} />

export const IconSettings = ({ className = 'w-5 h-5' }) => <Settings className={className} />

export const IconKyc = ({ className = 'w-5 h-5' }) => <BadgeCheck className={className} />

export const IconBanniere = ({ className = 'w-5 h-5' }) => <Image className={className} />
