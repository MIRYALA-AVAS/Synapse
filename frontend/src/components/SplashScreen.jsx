import logo from '../assets/logo.png';

export default function SplashScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
      <img src={logo} alt="Synapse" className="h-16 w-16 rounded-2xl object-cover" />
      <p className="text-lg font-semibold text-gray-800">Synapse</p>
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        Starting up, please wait…
      </div>
    </div>
  );
}
