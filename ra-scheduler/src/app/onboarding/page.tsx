'use client';

import { completeOnboarding } from './actions';
import { useState } from 'react';

export default function OnboardingPage() {
    const [isRc, setIsRc] = useState(false);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="max-w-md w-full bg-white p-8 shadow-md rounded-lg">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-[#00539B]">Welcome!</h1>
                    <p className="text-gray-600">Let's get you set up.</p>
                </div>

                <form action={completeOnboarding} className="space-y-6">
                    <div className="flex items-center">
                        <input
                            id="is_rc"
                            name="is_rc"
                            type="checkbox"
                            checked={isRc}
                            onChange={(e) => setIsRc(e.target.checked)}
                            className="h-4 w-4 text-[#00539B] focus:ring-[#00539B] border-gray-300 rounded"
                        />
                        <label htmlFor="is_rc" className="ml-2 block text-sm text-gray-900">
                            Are you an RC (Residence Coordinator)?
                        </label>
                    </div>

                    {isRc && (
                        <div>
                            <label htmlFor="team_name" className="block text-sm font-medium text-gray-700">
                                Team Name
                            </label>
                            <input
                                type="text"
                                name="team_name"
                                id="team_name"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#00539B] focus:border-[#00539B]"
                                placeholder="e.g. Few Quad"
                                required={isRc}
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#00539B] hover:bg-[#003366] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00539B]"
                    >
                        Get Started
                    </button>
                </form>
            </div>
        </div>
    );
}
