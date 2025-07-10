'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [githubToken, setGithubToken] = useState('');
  const [repositories, setRepositories] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [textAreaContent, setTextAreaContent] = useState('');
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  useEffect(() => {
    // Remove the token from localStorage on every page load/refresh
    localStorage.removeItem('githubToken');
    // Do not auto-load token from localStorage anymore
  }, []);

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

  useEffect(() => {
    if (githubToken) {
      // Do not store token in localStorage anymore
      fetchRepositories(githubToken);
    }
  }, [githubToken]);

  useEffect(() => {
    if (selectedRepo && githubToken) {
      fetchBranches(githubToken, selectedRepo);
    }
  }, [selectedRepo, githubToken]);

  const fetchRepositories = async (token: string) => {
    try {
      const response = await fetch('/api/repositories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      setRepositories(data.repositories || []);
    } catch (error) {
      console.error('Error fetching repositories:', error);
    }
  };

  const fetchBranches = async (token: string, repo: string) => {
    try {
      const response = await fetch('/api/branches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, repo }),
      });
      const data = await response.json();
      setBranches(data.branches || []);
      if (data.branches && data.branches.length > 0) {
        const defaultBranch = data.branches.find((branch: any) => branch.name === 'main' || branch.name === 'master');
        setSelectedBranch(defaultBranch ? defaultBranch.name : data.branches[0].name);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchFileContent = async (token: string, repo: string, branch: string, path: string) => {
    try {
      const response = await fetch('/api/file-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, repo, branch, path }),
      });
      const data = await response.json();
      setFileContent(data.content || '');
    } catch (error) {
      console.error('Error fetching file content:', error);
    }
  };

  const handleSearch = () => {
    if (searchTerm && selectedRepo && selectedBranch && githubToken) {
      fetchFileContent(githubToken, selectedRepo, selectedBranch, searchTerm);
    }
  };

  const handleSend = async () => {
    if (!githubToken || !selectedRepo || !selectedBranch || !textAreaContent) {
      alert('Please fill in all fields: GitHub token, repository, branch, and content');
      return;
    }

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

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
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
      <div className="flex flex-col items-center justify-start min-h-[calc(100vh-80px)] px-8 pt-20">
        {/* GitHub Token Input */}
        <div className="mb-8 w-full max-w-lg">
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
        <div className="w-full max-w-4xl relative overflow-visible">
          <textarea
            value={fileContent || textAreaContent}
            onChange={(e) => setTextAreaContent(e.target.value)}
            className="w-full h-80 bg-[#2a2a2a] text-white text-base p-6 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 resize-none"
            placeholder="Enter your content here or load file content..."
          />

          {/* Bottom Controls - Inside the textarea area */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between overflow-visible">
            <div className="flex items-center space-x-4">
              {/* Repository Dropdown */}
              <div className="relative dropdown-container">
                <div 
                  className="flex items-center space-x-2 bg-[#1a1a1a] rounded-lg px-4 py-2 cursor-pointer w-40"
                  onClick={() => {
                    setShowRepoDropdown(!showRepoDropdown);
                    setShowBranchDropdown(false);
                  }}
                >
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0h8v12H6V4z" clipRule="evenodd"></path>
                  </svg>
                  <span className="text-white truncate flex-1">{selectedRepo || 'Repository'}</span>
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path>
                  </svg>
                </div>
                {showRepoDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-40 bg-[#1a1a1a] border border-gray-600 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto scrollbar-none">
                    {repositories.length > 0 ? (
                      repositories.map((repo) => (
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
                      ))
                    ) : (
                      <div className="px-4 py-3 text-white">No repositories found</div>
                    )}
                  </div>
                )}
              </div>

              {/* Branch Dropdown */}
              <div className="relative dropdown-container">
                <div 
                  className="flex items-center space-x-2 bg-[#1a1a1a] rounded-lg px-4 py-2 cursor-pointer w-32"
                  onClick={() => {
                    setShowBranchDropdown(!showBranchDropdown);
                    setShowRepoDropdown(false);
                  }}
                >
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.769 2.156 18 4.828 18h10.343c2.673 0 4.012-3.231 2.122-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.027 1.028a1 1 0 00.707.293H15a1 1 0 010 2h-1.586a3 3 0 00-2.122.879l-1.027 1.027a1 1 0 01-.707.293H7a1 1 0 010-2h1.586a3 3 0 002.122-.879l1.027-1.027A3 3 0 009 8.172z" clipRule="evenodd"></path>
                  </svg>
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
                  </div>
                )}
              </div>
            </div>
            {/* Send Button - moved to far right */}
            <div className="flex items-center space-x-2 bg-[#1a1a1a] rounded-lg px-4 py-2">
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
      </div>
    </div>
  );
}
