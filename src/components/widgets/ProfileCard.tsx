'use client'

interface ProfileCardProps {
  stakeholder: {
    name: string
    email?: string
    stakeholder_type?: string
    phone?: string
    country?: string
    city?: string
  }
}

export function ProfileCard({ stakeholder }: ProfileCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">My Profile</h3>
      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-500">Name</p>
          <p className="text-base font-medium text-gray-900">{stakeholder.name}</p>
        </div>
        {stakeholder.email && (
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-base font-medium text-gray-900">{stakeholder.email}</p>
          </div>
        )}
        {stakeholder.stakeholder_type && (
          <div>
            <p className="text-sm text-gray-500">Type</p>
            <p className="text-base font-medium text-gray-900">{stakeholder.stakeholder_type}</p>
          </div>
        )}
        {stakeholder.phone && (
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="text-base font-medium text-gray-900">{stakeholder.phone}</p>
          </div>
        )}
        {stakeholder.city && (
          <div>
            <p className="text-sm text-gray-500">Location</p>
            <p className="text-base font-medium text-gray-900">
              {stakeholder.city}
              {stakeholder.country ? `, ${stakeholder.country}` : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
