// @desc    Get dashboard data for authenticated user
// @route   GET /api/dashboard
// @access  Private
exports.getDashboardData = async (req, res) => {
  try {
    const user = req.user;
    
    // We mock the dashboard data based on the screenshot
    const dashboardData = {
      user: {
        name: user.name,
        email: user.email,
      },
      recentActivity: [
        {
          id: 1,
          type: 'read',
          title: 'Read 5 new emails',
          description: 'From: Rahul, Priya, Team Update...',
          time: '9:30 AM',
          color: 'bg-indigo-50',
          iconColor: 'text-indigo-600'
        },
        {
          id: 2,
          type: 'compose',
          title: 'Composed an email',
          description: 'To: manager@company.com',
          time: '9:15 AM',
          color: 'bg-blue-50',
          iconColor: 'text-blue-600'
        },
        {
          id: 3,
          type: 'summarize',
          title: 'Summarized email',
          description: 'Project Update - Weekly Report',
          time: 'Yesterday',
          color: 'bg-emerald-50',
          iconColor: 'text-emerald-600'
        },
        {
          id: 4,
          type: 'search',
          title: 'Searched emails',
          description: 'Keyword: "Meeting"',
          time: 'Yesterday',
          color: 'bg-orange-50',
          iconColor: 'text-orange-500'
        }
      ],
      stats: {
        emailsReceived: 24,
        emailsSent: 6,
        summariesGenerated: 3,
        voiceCommands: 12
      }
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
