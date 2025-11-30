import { login } from './actions';

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="max-w-md w-full bg-white p-8 shadow-md rounded-lg">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-[#00539B]">Duke Log In</h1>
                    <p className="text-gray-600">NetID Authentication (Mock)</p>
                </div>

                <form action={login} className="space-y-6">
                    <div>
                        <label htmlFor="netid" className="block text-sm font-medium text-gray-700">
                            NetID
                        </label>
                        <input
                            type="text"
                            name="netid"
                            id="netid"
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#00539B] focus:border-[#00539B]"
                        />
                    </div>

                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Full Name
                        </label>
                        <input
                            type="text"
                            name="name"
                            id="name"
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#00539B] focus:border-[#00539B]"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#00539B] hover:bg-[#003366] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00539B]"
                    >
                        Log In
                    </button>
                </form>
            </div>
        </div>
    );
}
