import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Button,
  TextField,
  Box,
  List,
  ListItem,
  ListItemText,
  IconButton
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';

interface Goal {
  name: string;
  current: number;
  target: number;
}

interface GoalData {
  [key: string]: Goal;
}

function App() {
  const [goalData, setGoalData] = useState<GoalData>({
    goal1: { name: 'Read 10 books this year', current: 6, target: 10 },
    goal2: { name: 'Lose 20 lbs', current: 8, target: 20 },
    goal3: { name: 'Learn a new language', current: 90, target: 100 }
  });

  const [achievements, setAchievements] = useState<string[]>([
    'Completed first workout streak (7 days)',
    'Finished reading "Atomic Habits"',
    'Reached 1000 steps daily average'
  ]);

  const [newGoalName, setNewGoalName] = useState<string>('');
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editTarget, setEditTarget] = useState<number>(0);

  const [editingAchievement, setEditingAchievement] = useState<number | null>(null);
  const [editAchievementText, setEditAchievementText] = useState<string>('');

  const calculateOverallProgress = (): number => {
    const goals = Object.values(goalData);
    if (goals.length === 0) return 0;
    const totalPercentage = goals.reduce(
      (sum, goal) => sum + (goal.current / goal.target) * 100,
      0
    );
    return Math.round(totalPercentage / goals.length);
  };

  const [overallProgress, setOverallProgress] = useState<number>(
    calculateOverallProgress()
  );

  useEffect(() => {
    setOverallProgress(calculateOverallProgress());
  }, [goalData]);

  const updateGoal = (goalId: string) => {
    setGoalData(prev => {
      const goal = prev[goalId];
      if (goal.current < goal.target) {
        return {
          ...prev,
          [goalId]: { ...goal, current: goal.current + 1 }
        };
      }
      alert('Goal completed!');
      return prev;
    });
  };

  const resetGoal = (goalId: string) => {
    setGoalData(prev => ({
      ...prev,
      [goalId]: { ...prev[goalId], current: 0 }
    }));
  };

  const editGoal = (goalId: string) => {
    const goal = goalData[goalId];
    setEditingGoal(goalId);
    setEditName(goal.name);
    setEditTarget(goal.target);
  };

  const saveGoal = (goalId: string) => {
    if (editName.trim() && editTarget > 0) {
      setGoalData(prev => {
        const goal = prev[goalId];
        const newCurrent = goal.current > editTarget ? editTarget : goal.current;
        return {
          ...prev,
          [goalId]: { name: editName, current: newCurrent, target: editTarget }
        };
      });
      setEditingGoal(null);
    } else {
      alert('Please enter a valid name and target.');
    }
  };

  const cancelEdit = () => {
    setEditingGoal(null);
  };

  const deleteGoal = (goalId: string) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      setGoalData(prev => {
        const newData = { ...prev };
        delete newData[goalId];
        return newData;
      });
    }
  };

  const addNewGoal = () => {
    if (newGoalName.trim()) {
      const newId = 'goal' + (Object.keys(goalData).length + 1);
      setGoalData(prev => ({
        ...prev,
        [newId]: { name: newGoalName, current: 0, target: 100 }
      }));
      setNewGoalName('');
    } else {
      alert('Please enter a valid goal name.');
    }
  };

  const addAchievement = () => {
    const achievement = window.prompt('Enter new achievement:');
    if (achievement) {
      setAchievements(prev => [...prev, achievement]);
    }
  };

  const editAchievementItem = (index: number) => {
    setEditingAchievement(index);
    setEditAchievementText(achievements[index]);
  };

  const saveAchievement = (index: number) => {
    if (editAchievementText.trim()) {
      setAchievements(prev =>
        prev.map((a, i) => (i === index ? editAchievementText : a))
      );
      setEditingAchievement(null);
    } else {
      alert('Achievement cannot be empty.');
    }
  };

  const deleteAchievement = (index: number) => {
    if (window.confirm('Are you sure you want to delete this achievement?')) {
      setAchievements(prev => prev.filter((_, i) => i !== index));
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" component="h1" align="center" color="primary" gutterBottom>
        My Progress
      </Typography>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5">Overall Progress</Typography>
          <LinearProgress
            variant="determinate"
            value={overallProgress}
            sx={{ height: 10, borderRadius: 5 }}
          />
          <Typography variant="body1" sx={{ mt: 1 }}>
            {overallProgress}% Complete
          </Typography>
        </CardContent>
      </Card>

      {/* Goals Section */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5">Goals</Typography>
            <Box display="flex" alignItems="center">
              <TextField
                label="Goal name"
                size="small"
                value={newGoalName}
                onChange={e => setNewGoalName(e.target.value)}
                sx={{ mr: 1 }}
              />
              <Button variant="contained" onClick={addNewGoal}>
                Add Goal
              </Button>
            </Box>
          </Box>

          {Object.entries(goalData).map(([goalId, goal]) => (
            <Card key={goalId} sx={{ mb: 2 }}>
              <CardContent>
                {editingGoal === goalId ? (
                  <Box>
                    <TextField
                      label="Name"
                      fullWidth
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      sx={{ mb: 1 }}
                    />

                    <TextField
                      label="Target"
                      type="number"
                      fullWidth
                      value={editTarget}
                      onChange={e => setEditTarget(Number(e.target.value))}
                      sx={{ mb: 1 }}
                    />

                    <Button onClick={() => saveGoal(goalId)} sx={{ mr: 1 }}>
                      Save
                    </Button>
                    <Button onClick={cancelEdit}>Cancel</Button>
                  </Box>
                ) : (
                  <>
                    <Typography variant="h6">{goal.name}</Typography>

                    <LinearProgress
                      variant="determinate"
                      value={(goal.current / goal.target) * 100}
                      sx={{ height: 8, borderRadius: 4, mb: 1 }}
                    />

                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {goal.current}/{goal.target} completed
                    </Typography>

                    <Box>
                      <Button size="small" onClick={() => updateGoal(goalId)} sx={{ mr: 1 }}>
                        Increment
                      </Button>
                      <Button size="small" onClick={() => resetGoal(goalId)} sx={{ mr: 1 }}>
                        Reset
                      </Button>
                      <IconButton size="small" onClick={() => editGoal(goalId)}>
                        <Edit />
                      </IconButton>
                      <IconButton size="small" onClick={() => deleteGoal(goalId)}>
                        <Delete />
                      </IconButton>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Achievements Section */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5">Achievements</Typography>
            <Button variant="contained" onClick={addAchievement}>
              Add Achievement
            </Button>
          </Box>

          <List>
            {achievements.map((achievement, index) => (
              <ListItem key={index} sx={{ border: 1, borderColor: 'grey.300', borderRadius: 1, mb: 1 }}>
                {editingAchievement === index ? (
                  <Box flexGrow={1}>
                    <TextField
                      fullWidth
                      value={editAchievementText}
                      onChange={e => setEditAchievementText(e.target.value)}
                      sx={{ mb: 1 }}
                    />
                    <Button onClick={() => saveAchievement(index)}>Save</Button>
                  </Box>
                ) : (
                  <>
                    <ListItemText primary={achievement} />
                    <IconButton onClick={() => editAchievementItem(index)}>
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => deleteAchievement(index)}>
                      <Delete />
                    </IconButton>
                  </>
                )}
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Container>
  );
}

export default App;
