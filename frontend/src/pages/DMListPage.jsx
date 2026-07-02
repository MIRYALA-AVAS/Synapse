import ConversationList from '../components/dm/ConversationList';

export default function DMListPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-screen">
      {/* Sidebar list */}
      <div className="w-full border-r border-gray-200 bg-white md:w-72 lg:w-80">
        <div className="border-b border-gray-200 px-4 py-4">
          <h1 className="font-semibold text-gray-900">Messages</h1>
        </div>
        <ConversationList />
      </div>

      {/* Empty right panel on desktop */}
      <div className="hidden flex-1 flex-col items-center justify-center text-gray-400 md:flex">
        <p className="text-sm">Select a conversation to start chatting</p>
      </div>
    </div>
  );
}
