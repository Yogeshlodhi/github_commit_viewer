import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { getToken, removeToken } from "../utils/auth";

// const apiUrl = import.meta.env.VITE_API_URL;

interface Commit {
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}

interface Repo {
  id: number;
  name: string;
  private: boolean;
  owner: {
    login: string;
  };
}

interface Branch {
  name: string;
  commit: {
    sha: string;
  };
}

// interface UserInfo {
//   login: string;
//   avatar_url: string;
//   name: string;
//   bio: string;
//   html_url: string;
// }

interface PaginatedResponse {
  repos: Repo[];
  total: number;
  public: number;
  private: number;
  currentPage: number;
  totalPages: number;
}

const Dashboard = () => {
  const token = getToken();
  const navigate = useNavigate();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [commits, setCommits] = useState<Record<string, Commit[]>>({});
  const [branches, setBranches] = useState<Record<string, Branch[]>>({});
  const [selectedBranches, setSelectedBranches] = useState<Record<string, string>>({});
  const [expandedRepos, setExpandedRepos] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [loadingCommits, setLoadingCommits] = useState<Record<number, boolean>>({});
  const [loadingBranches, setLoadingBranches] = useState<Record<number, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [repoStats, setRepoStats] = useState({ total: 0, public: 0, private: 0 });
  const [error, setError] = useState<string | null>(null);
  // const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  const logout = () => {
    removeToken();
    navigate("/");
  };
  

  // const fetchUserInfo = async () => {
  //   try {
  //     const res = await axios.get("http://localhost:8000/auth/user", {
  //       params: { token },
  //     });
  //     setUserInfo(res.data);
  //   } catch (err) {
  //     console.error("Failed to fetch user info:", err);
  //   }
  // };

  const fetchRepos = async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<PaginatedResponse>("http://localhost:8000/auth/repos", {
        params: { 
          token,
          page,
          per_page: 6
        },
      });
      setRepos(res.data.repos || []);
      setTotalPages(res.data.totalPages || 1);
      setRepoStats({
        total: res.data.total || 0,
        public: res.data.public || 0,
        private: res.data.private || 0
      });
    } catch (err) {
      console.error("Failed to fetch repos:", err);
      setError("Failed to load repositories. Please try again later.");
      setRepos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      // fetchUserInfo();
      fetchRepos(currentPage);
    } else {
      navigate("/");
    }
  }, [currentPage, token]);

  const fetchBranches = async (repo: Repo) => {
    setLoadingBranches((prev) => ({ ...prev, [repo.id]: true }));
    try {
      const branchesRes = await axios.get("http://localhost:8000/auth/branches", {
        params: { token, owner: repo.owner.login, repo: repo.name },
      });
      setBranches((prev) => ({ ...prev, [repo.name]: branchesRes.data }));
      // Set default branch to main or master if available
      const defaultBranch = branchesRes.data.find((b: Branch) => b.name === 'main' || b.name === 'master')?.name || branchesRes.data[0]?.name;
      if (defaultBranch) {
        setSelectedBranches((prev) => ({ ...prev, [repo.name]: defaultBranch }));
      }
    } catch (err) {
      console.error("Failed to fetch branches:", err);
    } finally {
      setLoadingBranches((prev) => ({ ...prev, [repo.id]: false }));
    }
  };

  const fetchCommits = async (repo: Repo) => {
    setLoadingCommits((prev) => ({ ...prev, [repo.id]: true }));
    try {
      const selectedBranch = selectedBranches[repo.name] || 'main';
      const commitsRes = await axios.get("http://localhost:8000/auth/commits", {
        params: { 
          token, 
          owner: repo.owner.login, 
          repo: repo.name,
          branch: selectedBranch 
        },
      });
      // Ensure commits is always an array
      const commitsData = Array.isArray(commitsRes.data) ? commitsRes.data : [];
      setCommits((prev) => ({ ...prev, [repo.name]: commitsData }));
    } catch (err) {
      console.error("Failed to fetch commits:", err);
      setCommits((prev) => ({ ...prev, [repo.name]: [] }));
    } finally {
      setLoadingCommits((prev) => ({ ...prev, [repo.id]: false }));
    }
  };

  const toggleExpand = (repo: Repo) => {
    if (!expandedRepos[repo.id]) {
      if (!branches[repo.name]) {
        fetchBranches(repo);
      }
      if (!commits[repo.name]) {
        fetchCommits(repo);
      }
    }
    setExpandedRepos((prev) => ({
      ...prev,
      [repo.id]: !prev[repo.id]
    }));
  };

  const handleBranchChange = (repo: Repo, branchName: string) => {
    setSelectedBranches((prev) => ({ ...prev, [repo.name]: branchName }));
    fetchCommits(repo);
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    setExpandedRepos({});
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-semibold">Git Viewer</h1>
          </div>
          <button
            onClick={logout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        {/* User Profile Section */}
        {/* {userInfo && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-start space-x-6">
              <img 
                src={userInfo.avatar_url} 
                alt="Profile" 
                className="w-24 h-24 rounded-full border-4 border-gray-200"
              />
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{userInfo.name || userInfo.login}</h2>
                <p className="text-gray-600 mb-2">@{userInfo.login}</p>
                {userInfo.bio && (
                  <p className="text-gray-700 mb-4">{userInfo.bio}</p>
                )}
                <a 
                  href={userInfo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  View GitHub Profile →
                </a>
              </div>
            </div>
          </div>
        )} */}

        {/* Repository Statistics */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h3 className="text-3xl font-bold text-blue-600">{repoStats.total}</h3>
            <p className="text-gray-600">Total Repositories</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h3 className="text-3xl font-bold text-green-600">{repoStats.public}</h3>
            <p className="text-gray-600">Public Repositories</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h3 className="text-3xl font-bold text-purple-600">{repoStats.private}</h3>
            <p className="text-gray-600">Private Repositories</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Repositories</h2>

        {error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => fetchRepos(currentPage)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-lg text-gray-600">Loading repositories...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {repos.map((repo) => (
                <div key={repo.id} className="bg-white rounded-lg shadow-md overflow-hidden h-fit">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-blue-600 mb-2">{repo.name}</h3>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          repo.private ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {repo.private ? 'Private' : 'Public'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {expandedRepos[repo.id] && (
                          <>
                            {loadingBranches[repo.id] ? (
                              <div className="w-32 h-10 flex items-center justify-center">
                                <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
                              </div>
                            ) : branches[repo.name] && (
                              <select
                                value={selectedBranches[repo.name] || ''}
                                onChange={(e) => handleBranchChange(repo, e.target.value)}
                                className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                              >
                                {branches[repo.name].map((branch) => (
                                  <option key={branch.name} value={branch.name}>
                                    {branch.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </>
                        )}
                        <button
                          onClick={() => toggleExpand(repo)}
                          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          {expandedRepos[repo.id] ? 'Hide Commits' : 'Show Commits'}
                        </button>
                      </div>
                    </div>
                    
                    {expandedRepos[repo.id] && (
                      <div className="mt-4 border-t pt-4">
                        {loadingCommits[repo.id] ? (
                          <div className="text-center py-4">
                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                            <p className="mt-2 text-sm text-gray-600">Loading commits...</p>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {Array.isArray(commits[repo.name]) && commits[repo.name].map((commit, index) => (
                              <div key={index} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <p className="font-medium text-gray-900 mb-1">{commit.commit.message}</p>
                                <div className="flex items-center text-sm text-gray-600">
                                  <span>{commit.commit.author.name}</span>
                                  <span className="mx-2">•</span>
                                  <span>{new Date(commit.commit.author.date).toLocaleString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-md ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>

                <div className="flex items-center space-x-2">
                  {[...Array(totalPages)].map((_, index) => (
                    <button
                      key={index + 1}
                      onClick={() => handlePageChange(index + 1)}
                      className={`w-10 h-10 rounded-md ${
                        currentPage === index + 1
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-md ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
            )}

            {/* Page Info */}
            <div className="mt-4 text-center text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;