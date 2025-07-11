'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FaTrash } from 'react-icons/fa';
import { FaFolder } from 'react-icons/fa';
import { FaCodeBranch } from 'react-icons/fa';

function truncateText(text: string, maxLength: number) {
  return text.length > maxLength ? text.slice(0, maxLength) + '…' : text;
}

type Message = { text: string, timestamp: string };
type Conversation = {
  id: number,
  repo: string,
  branch: string,
  messages: Message[],
};

// Helper to delete a message from a conversation
const deleteMessageFromConversation = (
  conversations: Conversation[],
  conversationId: number,
  messageIdx: number
) => {
  return conversations.map(conv => {
    if (conv.id !== conversationId) return conv;
    return {
      ...conv,
      messages: conv.messages.filter((_: unknown, idx: number) => idx !== messageIdx),
    };
  }).filter(conv => conv.messages.length > 0); // Remove conversation if no messages left
};

export default function Home() {
  const [githubToken, setGithubToken] = useState('');
  type Repository = { id: number; full_name: string };
  type Branch = { name: string };
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [fileContent] = useState('');
  const [textAreaContent, setTextAreaContent] = useState('');
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  // Update conversation data model
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<number|null>(null);
  const conversationIdRef = useRef(1);
  const [isAddingRepo, setIsAddingRepo] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [isAddingBranch, setIsAddingBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  useEffect(() => {
    // Remove the token from localStorage on every page load/refresh
    localStorage.removeItem('githubToken');
    // Do not auto-load token from localStorage anymore
  }, []);

  // Reset selectedRepo and selectedBranch when githubToken changes
  useEffect(() => {
    setSelectedRepo('');
    setSelectedBranch('');
  }, [githubToken]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowRepoDropdown(false);
        setShowBranchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchRepositories = useCallback(async (token: string) => {
    try {
      const response = await fetch('/api/repositories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      setRepositories((data.repositories as Repository[]) || []);
    } catch (error) {
      console.error('Error fetching repositories:', error);
    }
  }, []);

  const fetchBranches = useCallback(async (token: string, repo: string) => {
    try {
      const response = await fetch('/api/branches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, repo }),
      });
      const data = await response.json();
      setBranches((data.branches as Branch[]) || []);
      if (data.branches && data.branches.length > 0) {
        const defaultBranch = (data.branches as Branch[]).find((branch) => branch.name === 'main' || branch.name === 'master');
        setSelectedBranch(defaultBranch ? defaultBranch.name : data.branches[0].name);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  }, []);

  useEffect(() => {
    if (selectedRepo && githubToken) {
      fetchBranches(githubToken, selectedRepo);
    }
  }, [selectedRepo, githubToken, fetchBranches]);

  const handleSend = async () => {
    if (!githubToken || !selectedRepo || !selectedBranch || !textAreaContent) {
      alert('Please fill in all fields: GitHub token, repository, branch, and content');
      return;
    }

    // Save message to conversation thread
    setConversations(prev => {
      // Find existing thread for repo+branch
      const idx = prev.findIndex(
        c => c.repo === selectedRepo && c.branch === selectedBranch
      );
      const newMessage: Message = {
        text: textAreaContent,
        timestamp: new Date().toISOString(),
      };
      if (idx !== -1) {
        // Add message to existing thread
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          messages: [...updated[idx].messages, newMessage],
        };
        return updated;
      } else {
        // Create new thread
        return [
          ...prev,
          {
            id: conversationIdRef.current++,
            repo: selectedRepo,
            branch: selectedBranch,
            messages: [newMessage],
          },
        ];
      }
    });

    try {
      const response = await fetch('/api/send-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: githubToken,
          repository: selectedRepo,
          branch: selectedBranch,
          content: textAreaContent,
        }),
      });

      if (response.ok) {
        alert('Data sent successfully!');
        setTextAreaContent('');
      } else {
        alert('Failed to send data');
      }
    } catch (error) {
      console.error('Error sending data:', error);
      alert('Error sending data');
    }
  };

  // Add new repo/branch handlers
  const handleAddRepo = () => {
    setIsAddingRepo(true);
    setTimeout(() => {
      const input = document.getElementById('add-repo-input');
      if (input) (input as HTMLInputElement).focus();
    }, 0);
  };
  const handleAddBranch = () => {
    if (!selectedRepo) return;
    setIsAddingBranch(true);
    setTimeout(() => {
      const input = document.getElementById('add-branch-input');
      if (input) (input as HTMLInputElement).focus();
    }, 0);
  };
  const handleRepoInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewRepoName(e.target.value);
  };
  const handleRepoInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newRepoName.trim()) {
      setRepositories(prev => [...prev, { id: Date.now(), full_name: newRepoName.trim() }]);
      setNewRepoName('');
      setIsAddingRepo(false);
    } else if (e.key === 'Escape') {
      setNewRepoName('');
      setIsAddingRepo(false);
    }
  };
  const handleRepoInputBlur = () => {
    if (newRepoName.trim()) {
      setRepositories(prev => [...prev, { id: Date.now(), full_name: newRepoName.trim() }]);
    }
    setNewRepoName('');
    setIsAddingRepo(false);
  };
  const handleBranchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewBranchName(e.target.value);
  };
  const handleBranchInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newBranchName.trim()) {
      setBranches(prev => [...prev, { name: newBranchName.trim() }]);
      setNewBranchName('');
      setIsAddingBranch(false);
    } else if (e.key === 'Escape') {
      setNewBranchName('');
      setIsAddingBranch(false);
    }
  };
  const handleBranchInputBlur = () => {
    if (newBranchName.trim()) {
      setBranches(prev => [...prev, { name: newBranchName.trim() }]);
    }
    setNewBranchName('');
    setIsAddingBranch(false);
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      {/* Header */}
      <div className="flex flex-row items-center justify-between p-4 border-b border-gray-800 gap-2">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
            <span className="text-black text-sm font-bold">Z</span>
          </div>
          <span className="text-white font-medium">Zangoh</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-gray-400">Help</span>
          <span className="text-gray-400">About</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-start min-h-[calc(100vh-80px)] px-2 sm:px-4 md:px-8 pt-4">
        {/* Conversation Detail View */}
        {selectedConversation !== null ? (
          <div className="w-full max-w-4xl bg-[#232323] rounded-lg p-4 sm:p-8 mt-8 shadow-lg">
            <div className="flex items-center mb-6">
              <button
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                onClick={() => setSelectedConversation(null)}
              >
                ← Back
              </button>
            </div>
            <div className="mb-4 text-xs text-gray-400 flex items-center justify-between">
              <span>
                {(() => {
                  const conv = conversations.find(c => c.id === selectedConversation);
                  if (!conv) return null;
                  return (
                    <>
                      <span className="font-semibold">Repo:</span> {conv.repo || '-'} &nbsp; | &nbsp;
                      <span className="font-semibold">Branch:</span> {conv.branch || '-'}
                    </>
                  );
                })()}
              </span>
            </div>
            <div className="flex flex-col gap-4 sm:gap-6">
              {(() => {
                const conv = conversations.find(c => c.id === selectedConversation);
                if (!conv) return null;
                return conv.messages.map((msg, idx) => (
                  <div key={idx} className="bg-[#181818] rounded p-4 sm:p-6 border border-gray-800 flex flex-col">
                    <div className="mb-2">
                      <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="text-lg text-white whitespace-pre-wrap flex-1">{msg.text}</div>
                      <button
                        className="ml-2 flex items-center justify-center w-6 h-6 bg-transparent hover:bg-white/20 rounded-full text-white"
                        title="Delete message"
                        onClick={() => {
                          if (window.confirm('Delete this message?')) {
                            setConversations(prev => deleteMessageFromConversation(prev, conv.id, idx));
                          }
                        }}
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        ) : (
          <>
            {/* GitHub Token Input */}
            <div className="mb-8 w-full max-w-lg px-0 sm:px-2">
              <div className="flex items-center bg-[#2a2a2a] rounded-lg border border-gray-700 px-3 py-2">
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  className="bg-transparent text-white text-sm flex-1 focus:outline-none placeholder-gray-400"
                  placeholder="Enter your GitHub token..."
                />
                <button
                  onClick={() => githubToken && fetchRepositories(githubToken)}
                  className="ml-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Central Text Area */}
            <div className="w-full max-w-4xl relative">
              <textarea
                value={fileContent || textAreaContent}
                onChange={(e) => setTextAreaContent(e.target.value)}
                className="w-full h-120 sm:h-60 md:h-80 bg-[#2a2a2a] text-white text-base sm:text-base text-lg p-5 sm:p-6 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 resize-none relative z-10 textarea-with-controls"
                placeholder="Enter your content here..."
              />
              {/* Fade overlay to hide text behind controls */}
              <div className="textarea-fade-overlay"></div>

              {/* Bottom Controls - Inside the textarea area */}
              <div className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 overflow-visible z-20">
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:space-x-4 w-full sm:w-auto">
                  {/* Repository Dropdown */}
                  <div className="relative dropdown-container w-full sm:w-auto">
                    <div 
                      className="flex items-center space-x-2 bg-[#1a1a1a] rounded-lg px-3 sm:px-4 py-2 cursor-pointer w-full sm:w-40"
                      onClick={() => {
                        setShowRepoDropdown(!showRepoDropdown);
                        setShowBranchDropdown(false);
                      }}
                    >
                      <FaFolder className="text-gray-400" size={16} />
                      <span className="text-white truncate flex-1">{selectedRepo || 'Repository'}</span>
                      <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path>
                      </svg>
                    </div>
                    {showRepoDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-40 bg-[#1a1a1a] border border-gray-600 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto scrollbar-none">
                        {repositories.length > 0 && repositories.map((repo) => (
                          <div
                            key={repo.id}
                            className="px-4 py-3 hover:bg-gray-700 cursor-pointer text-white border-b border-gray-600 last:border-b-0 dropdown-item overflow-x-auto whitespace-nowrap scrollbar-none"
                            onClick={() => {
                              setSelectedRepo(repo.full_name);
                              setShowRepoDropdown(false);
                            }}
                          >
                            <span className="dropdown-text">
                              {repo.full_name}
                            </span>
                          </div>
                        ))}
                        {/* Plus sign for add new repo */}
                        {isAddingRepo ? (
                          <div className="px-4 py-3 flex items-center space-x-2 border-b border-gray-600 last:border-b-0 dropdown-item">
                            <span className="text-xl font-bold">+</span>
                            <input
                              id="add-repo-input"
                              className="bg-[#232323] text-white text-sm px-2 py-1 rounded border border-gray-700 focus:outline-none w-24"
                              placeholder="Enter repo name"
                              value={newRepoName}
                              onChange={handleRepoInput}
                              onKeyDown={handleRepoInputKey}
                              onBlur={handleRepoInputBlur}
                            />
                          </div>
                        ) : (
                          <div
                            className="px-4 py-3 flex items-center space-x-2 hover:bg-gray-700 cursor-pointer text-white border-b border-gray-600 last:border-b-0 dropdown-item"
                            onClick={handleAddRepo}
                          >
                            <span className="text-xl font-bold">+</span>
                            <span className="text-sm">Add new repo</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Branch Dropdown */}
                  <div className="relative dropdown-container w-full sm:w-auto">
                    <div 
                      className="flex items-center space-x-2 bg-[#1a1a1a] rounded-lg px-3 sm:px-4 py-2 cursor-pointer w-full sm:w-32"
                      onClick={() => {
                        setShowBranchDropdown(!showBranchDropdown);
                        setShowRepoDropdown(false);
                      }}
                    >
                      <FaCodeBranch className="text-gray-400" size={16} />
                      <span className="text-white flex-1">{selectedBranch ? (selectedBranch.length > 10 ? selectedBranch.substring(0, 10) + '...' : selectedBranch) : 'Branch'}</span>
                      <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path>
                      </svg>
                    </div>
                    {showBranchDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-32 bg-[#1a1a1a] border border-gray-600 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto scrollbar-none">
                        {branches.map((branch) => (
                          <div
                            key={branch.name}
                            className="px-4 py-3 hover:bg-gray-700 cursor-pointer text-white border-b border-gray-600 last:border-b-0 overflow-x-auto whitespace-nowrap scrollbar-none"
                            onClick={() => {
                              setSelectedBranch(branch.name);
                              setShowBranchDropdown(false);
                            }}
                          >
                            {branch.name}
                          </div>
                        ))}
                        {/* Plus sign for add new branch, only if repo is selected */}
                        {selectedRepo && (
                          isAddingBranch ? (
                            <div className="px-4 py-3 flex items-center space-x-2 border-b border-gray-600 last:border-b-0 dropdown-item">
                              <span className="text-xl font-bold">+</span>
                              <input
                                id="add-branch-input"
                                className="bg-[#232323] text-white text-sm px-2 py-1 rounded border border-gray-700 focus:outline-none w-24"
                                placeholder="Enter branch name"
                                value={newBranchName}
                                onChange={handleBranchInput}
                                onKeyDown={handleBranchInputKey}
                                onBlur={handleBranchInputBlur}
                              />
                            </div>
                          ) : (
                            <div
                              className="px-4 py-3 flex items-center space-x-2 hover:bg-gray-700 cursor-pointer text-white border-b border-gray-600 last:border-b-0 dropdown-item"
                              onClick={handleAddBranch}
                            >
                              <span className="text-xl font-bold">+</span>
                              <span className="text-sm">Add branch</span>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {/* Send Button */}
                <div className="flex items-center space-x-2 bg-[#1a1a1a] rounded-lg px-3 sm:px-4 py-2 mt-2 sm:mt-0 w-full sm:w-auto justify-center">
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"></path>
                  </svg>
                  <button
                    onClick={handleSend}
                    className="bg-transparent text-white focus:outline-none"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>

            {/* Conversations Heading and List - below main box */}
            <div className="w-full max-w-4xl mt-8 px-0 sm:px-2">
              <h2 className="text-lg font-semibold mb-2 tracking-tight text-white">Conversations</h2>
              <div className="border-b border-gray-800 mb-2" />
              <div className="divide-y divide-gray-800 bg-[#1a1a1a] rounded-lg">
                {conversations.length === 0 && (
                  <div className="text-gray-400 text-center py-8">No conversations yet.</div>
                )}
                {conversations.map((conv) => {
                  const lastMsg = conv.messages[conv.messages.length - 1];
                  return (
                    <div
                      key={conv.id}
                      className="group px-0 py-4 cursor-pointer hover:bg-[#232323] transition-colors"
                      onClick={() => setSelectedConversation(conv.id)}
                    >
                      <div className="flex flex-col pl-4">
                        <span className="text-base font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                          {truncateText(lastMsg?.text || '', 40)}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          {lastMsg ? new Date(lastMsg.timestamp).toLocaleString() : ''} 
                          {conv.repo && `· ${conv.repo}`}
                          {conv.branch && ` · ${conv.branch}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
