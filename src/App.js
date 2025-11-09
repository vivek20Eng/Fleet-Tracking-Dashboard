import React, { useState, useEffect, useRef } from 'react';
import {
  Container, AppBar, Toolbar, Typography, Box, Slider, IconButton, Card, CardContent,
  Grid, Chip, LinearProgress, Accordion, AccordionSummary, AccordionDetails, Paper,
  Alert, useTheme, ThemeProvider, createTheme, Tooltip, Fab, Zoom, Divider, List, ListItem, ListItemText,
  ListItemIcon, Button,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon, Cancel as CancelIcon, Directions as DirectionsIcon,
  Warning as WarningIcon, Speed as SpeedIcon, LocationOn as LocationOnIcon, Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import moment from 'moment';
import './App.css';

import tripsData from './data/trip_1_cross_country.json';
import urbanData from './data/trip_2_urban_dense.json';
import mountainData from './data/trip_3_mountain_cancelled.json';
import southernData from './data/trip_4_southern_technical.json';
import regionalData from './data/trip_5_regional_logistics.json';

const TRIPS = [
  { id: 1, name: 'Cross-Country Long Haul', data: tripsData, color: '#1976d2', icon: '🚛' },
  { id: 2, name: 'Urban Dense Delivery', data: urbanData, color: '#f50057', icon: '📦' },
  { id: 3, name: 'Mountain Route Cancelled', data: mountainData, color: '#d32f2f', icon: '⛰️' },
  { id: 4, name: 'Southern Technical Issues', data: southernData, color: '#ed6c02', icon: '🔧' },
  { id: 5, name: 'Regional Logistics', data: regionalData, color: '#2196f3', icon: '🛣️' },
];

// Custom marker icons
const createCustomMarker = (color, icon) => L.divIcon({
  html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 12px; color: white; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">${icon}</div>`,
  className: 'custom-div-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const TRIP_ICONS = TRIPS.reduce((acc, trip) => {
  acc[trip.id] = createCustomMarker(trip.color, trip.icon);
  return acc;
}, {});

function MapEvents({ positions, paths }) {
  const map = useMapEvents({
    load: () => {
      if (positions.length > 0) {
        map.fitBounds(positions, { padding: [50, 50] });
      }
    },
    // Removed zoomend handler to prevent auto-zoom interference during user interaction
  });
  return null;
}

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(new Date('2025-11-03T08:00:00.000Z'));
  const [tripStates, setTripStates] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [dataError, setDataError] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [expandedTrip, setExpandedTrip] = useState(null);
  const mapRef = useRef();
  const theme = useTheme();
  const mode = darkMode ? 'dark' : 'light';
  const darkTheme = createTheme({ 
    palette: { 
      mode,
      primary: { main: '#1976d2', contrastText: '#fff' },
      secondary: { main: '#dc004e', contrastText: '#fff' },
      error: { main: '#d32f2f', contrastText: '#fff' },
      warning: { main: '#ed6c02', contrastText: '#fff' },
      info: { main: '#2196f3', contrastText: '#fff' },
      success: { main: '#2e7d32', contrastText: '#fff' },
      default: { main: '#9e9e9e', contrastText: '#000' },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            height: 8,
          },
        },
      },
    },
  });

  const speeds = [1, 2, 5];

  const getChipColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      case 'active': return 'info';
      case 'idle': return 'default';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon sx={{ color: 'success.main' }} />;
      case 'cancelled': return <CancelIcon sx={{ color: 'error.main' }} />;
      case 'active': return <DirectionsIcon sx={{ color: 'info.main' }} />;
      case 'idle': return <LocationOnIcon sx={{ color: 'default.main' }} />;
      default: return <WarningIcon sx={{ color: 'error.main' }} />;
    }
  };

  useEffect(() => {
    const states = TRIPS
      .filter(trip => Array.isArray(trip.data) && trip.data.length > 0)
      .map(trip => processTripData(trip.data, currentTime, trip.id, trip.color));
    
    const hasValidData = states.length > 0;
    setTripStates(states);
    setDataError(!hasValidData);
    
    if (!hasValidData) {
      console.error('No valid trip data found. Check JSON files in src/data/');
    }
  }, [currentTime]);

  useEffect(() => {
    let interval;
    if (isPlaying && !dataError) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const next = new Date(prev.getTime() + (1000 * simulationSpeed));
          const maxTime = new Date('2025-11-08T00:00:00.000Z');
          return next > maxTime ? prev : next;
        });
      }, 1000 / simulationSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, simulationSpeed, dataError]);

  const processTripData = (events, simTime, tripId, color) => {
    if (!events || !Array.isArray(events) || events.length === 0) {
      console.warn(`Invalid data for trip ${tripId}`);
      return { 
        tripId,
        status: 'error', 
        progress: 0, 
        position: null, 
        path: [], 
        alerts: ['Data Invalid'], 
        events: [], 
        totalEvents: 0, 
        color,
        speed: 0
      };
    }

    const filteredEvents = events.filter(e => e && e.timestamp && new Date(e.timestamp) <= simTime);
    if (filteredEvents.length === 0) {
      return { 
        tripId,
        status: 'idle', 
        progress: 0, 
        position: null, 
        path: [], 
        alerts: [], 
        events: [],
        totalEvents: events.length,
        speed: 0,
        color
      };
    }

    const latestEvent = filteredEvents[filteredEvents.length - 1];
    const plannedDist = events[0]?.planned_distance_km || 0;
    const distTravelled = latestEvent.distance_travelled_km || latestEvent.total_distance_km || latestEvent.distance_completed_km || 0;
    const progress = plannedDist > 0 ? Math.min((distTravelled / plannedDist) * 100, 100) : 0;

    let status = 'active';
    let alerts = [];
    if (latestEvent.event_type === 'trip_completed') status = 'completed';
    if (latestEvent.event_type === 'trip_cancelled') status = 'cancelled';
    if (latestEvent.overspeed === true) alerts.push('Overspeed Alert');
    if (latestEvent.event_type === 'signal_lost') alerts.push('Signal Lost');
    if (latestEvent.event_type === 'fuel_level_low' || latestEvent.battery_low) alerts.push('Low Fuel/Battery');
    if (latestEvent.event_type === 'trip_cancelled') alerts.push(latestEvent.cancellation_reason || 'Cancelled');

    const path = filteredEvents.filter(e => e.location).map(e => [e.location.lat, e.location.lng]);

    return {
      tripId,
      status,
      progress,
      position: latestEvent.location || null,
      speed: latestEvent.movement?.speed_kmh || 0,
      path,
      alerts,
      events: filteredEvents.slice(-5),
      totalEvents: events.length,
      color,
    };
  };

  const fleetMetrics = tripStates.reduce((acc, s) => {
    acc.active += s.status === 'active' ? 1 : 0;
    acc.completed += s.status === 'completed' ? 1 : 0;
    acc.cancelled += s.status === 'cancelled' ? 1 : 0;
    const tripData = TRIPS.find(t => t.id === s.tripId)?.data;
    acc.totalDistance += (s.progress / 100) * (tripData?.[0]?.planned_distance_km || 0);
    acc.avgSpeed += s.speed || 0;
    return acc;
  }, { active: 0, completed: 0, cancelled: 0, totalDistance: 0, avgSpeed: 0 });
  fleetMetrics.avgSpeed = tripStates.length > 0 ? fleetMetrics.avgSpeed / tripStates.length : 0;

  const totalAlerts = tripStates.reduce((sum, s) => sum + (s.alerts?.length || 0), 0);

  const allPositions = tripStates
    .filter(s => s.position)
    .map(s => [s.position.lat, s.position.lng]);
  const allPaths = tripStates.filter(s => s.path.length > 1);

  const handleTripSelect = (tripId) => {
    const newSelected = tripId === selectedTrip ? null : tripId;
    setSelectedTrip(newSelected);
    setExpandedTrip(newSelected);
    if (mapRef.current && newSelected) {
      const state = tripStates.find(s => s.tripId === newSelected);
      if (state && state.path.length > 0) {
        mapRef.current.fitBounds(state.path, { padding: [20, 20] });
      }
    }
  };

  if (dataError) {
    return (
      <ThemeProvider theme={darkTheme}>
        <Container maxWidth="xl" sx={{ mt: 8 }}>
          <Alert severity="error" action={
            <IconButton color="inherit" size="small" onClick={() => window.location.reload()}>
              <RefreshIcon />
            </IconButton>
          }>
            <Typography variant="h6">Data Loading Error</Typography>
            <Typography>JSON files in src/data/ are invalid or missing. Regenerate using 'npm run generate' in data-generator folder, then copy to src/data/. Click refresh to retry.</Typography>
          </Alert>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <div className="App">
        <AppBar position="fixed" elevation={0} sx={{ backgroundColor: 'background.paper', color: 'text.primary', borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', textAlign: 'center', flexGrow: 1 }}>
                🚀 Fleet Tracking Dashboard
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
              <Tooltip title={`Current Simulation Time: ${moment(currentTime).format('YYYY-MM-DD HH:mm:ss UTC')}`}>
                <Typography variant="body1" sx={{ mr: 2, fontSize: '0.9rem' }}>
                  {moment(currentTime).format('MMM DD, HH:mm')}
                </Typography>
              </Tooltip>
              <Tooltip title={isPlaying ? 'Pause Simulation' : 'Start Simulation'}>
                <IconButton color="primary" onClick={() => setIsPlaying(!isPlaying)} size="large">
                  {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Simulation Speed">
                <Box sx={{ mr: 2 }}>
                  <Typography variant="body2" sx={{ mr: 1 }}>Speed:</Typography>
                  <Slider
                    value={speeds.indexOf(simulationSpeed)}
                    onChange={(_, v) => setSimulationSpeed(speeds[v])}
                    marks={speeds.map((s, i) => ({ value: i, label: `${s}x` }))}
                    min={0}
                    max={speeds.length - 1}
                    size="small"
                    sx={{ width: 120 }}
                  />
                </Box>
              </Tooltip>
              <Tooltip title={darkMode ? 'Light Mode' : 'Dark Mode'}>
                <IconButton color="inherit" onClick={() => setDarkMode(!darkMode)}>
                  {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
                </IconButton>
              </Tooltip>
            </Box>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ mt: 8, pb: 4 }}>
          {/* Enhanced Fleet Overview with Icons */}
          <Zoom in={true}>
            <Paper elevation={4} sx={{ p: 3, mb: 4, borderRadius: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <SpeedIcon sx={{ mr: 1, color: 'primary.main' }} />
                Fleet Overview
              </Typography>
              {totalAlerts > 0 && (
                <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                  <WarningIcon sx={{ mr: 1 }} /> Total Active Alerts: {totalAlerts}
                </Alert>
              )}
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={2.4} key="active">
                  <Card sx={{ height: '100%' }}>
                    <CardContent sx={{ textAlign: 'center', p: 2 }}>
                      <DirectionsIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                      <Typography color="textSecondary" gutterBottom>Active Trips</Typography>
                      <Typography variant="h3" color="info.main">{fleetMetrics.active}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4} key="completed">
                  <Card sx={{ height: '100%' }}>
                    <CardContent sx={{ textAlign: 'center', p: 2 }}>
                      <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                      <Typography color="textSecondary" gutterBottom>Completed</Typography>
                      <Typography variant="h3" color="success.main">{fleetMetrics.completed}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4} key="cancelled">
                  <Card sx={{ height: '100%' }}>
                    <CardContent sx={{ textAlign: 'center', p: 2 }}>
                      <CancelIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                      <Typography color="textSecondary" gutterBottom>Cancelled</Typography>
                      <Typography variant="h3" color="error.main">{fleetMetrics.cancelled}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4} key="distance">
                  <Card sx={{ height: '100%' }}>
                    <CardContent sx={{ textAlign: 'center', p: 2 }}>
                      <LocationOnIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                      <Typography color="textSecondary" gutterBottom>Total Distance (km)</Typography>
                      <Typography variant="h3" color="primary.main">{fleetMetrics.totalDistance.toFixed(0)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4} key="speed">
                  <Card sx={{ height: '100%' }}>
                    <CardContent sx={{ textAlign: 'center', p: 2 }}>
                      <SpeedIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
                      <Typography color="textSecondary" gutterBottom>Avg Speed (km/h)</Typography>
                      <Typography variant="h3" color="secondary.main">{fleetMetrics.avgSpeed.toFixed(0)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          </Zoom>

          {/* Enhanced Map with Uber-like Navigation */}
          <Paper elevation={4} sx={{ mb: 4, borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ p: 3, backgroundColor: 'background.paper', borderBottom: 1, borderColor: 'divider', position: 'relative' }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <DirectionsIcon sx={{ mr: 1, color: 'primary.main' }} />
                Live Fleet Map & Navigation
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ ml: 4 }}>
                All routes shown. Click a trip below to focus and highlight.
              </Typography>
              <Fab
                size="small"
                color="primary"
                aria-label="Fit to all trips"
                onClick={() => {
                  if (allPositions.length > 0 && mapRef.current) {
                    mapRef.current.fitBounds(allPositions, { padding: [50, 50] });
                  }
                }}
                sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1000 }}
              >
                <RefreshIcon />
              </Fab>
            </Box>
            <MapContainer
              ref={mapRef}
              center={[39.8283, -98.5795]}
              zoom={4}
              style={{ height: '500px', width: '100%', borderRadius: '0 0 12px 12px' }}
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapEvents positions={allPositions} paths={allPaths} />
              {tripStates.map((state) => (
                state.position && (
                  <Marker
                    key={`marker-${state.tripId}`}
                    position={[state.position.lat, state.position.lng]}
                    icon={TRIP_ICONS[state.tripId]}
                  >
                    <Popup>
                      <Box sx={{ minWidth: 200 }}>
                        <Typography variant="h6" gutterBottom>{TRIPS.find(t => t.id === state.tripId)?.name}</Typography>
                        <Typography variant="body2"><strong>Status:</strong> {state.status}</Typography>
                        <Typography variant="body2"><strong>Speed:</strong> {state.speed} km/h</Typography>
                        <Typography variant="body2"><strong>Progress:</strong> {state.progress.toFixed(1)}%</Typography>
                        {state.alerts?.length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            {state.alerts.map((alert, i) => (
                              <Chip key={`alert-${i}-${alert}`} label={alert} color="error" size="small" sx={{ mr: 1, mb: 1 }} />
                            ))}
                          </Box>
                        )}
                        <Divider sx={{ my: 1 }} />
                        <Button
                          variant="outlined"
                          size="small"
                          fullWidth
                          onClick={() => handleTripSelect(state.tripId)}
                        >
                          Focus Route
                        </Button>
                      </Box>
                    </Popup>
                  </Marker>
                )
              ))}
              {tripStates.map((state) => state.path?.length > 1 && (
                <Polyline
                  key={`path-${state.tripId}`}
                  positions={state.path}
                  color={state.color}
                  weight={selectedTrip === state.tripId ? 6 : 4}
                  opacity={1}
                  dashArray={''} // All paths solid for better visibility during travel
                />
              ))}
            </MapContainer>
          </Paper>

          {/* Enhanced Individual Trips with Navigation Focus */}
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <LocationOnIcon sx={{ mr: 1, color: 'primary.main' }} />
            Individual Trip Details
          </Typography>
          <Grid container spacing={3}>
            {tripStates.map((state) => {
              const trip = TRIPS.find(t => t.id === state.tripId) || { name: 'Unknown', color: '#000', icon: '❓' };
              const isSelected = selectedTrip === state.tripId;
              return (
                <Grid item xs={12} md={6} lg={4} key={`trip-grid-${state.tripId}`}>
                  <Card
                    elevation={isSelected ? 8 : 2}
                    sx={{ 
                      height: '100%', 
                      border: isSelected ? `2px solid ${trip.color}` : 'none',
                      transition: 'all 0.3s ease',
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ mr: 2, p: 1, backgroundColor: trip.color + '20', borderRadius: 2 }}>
                          <span style={{ fontSize: 24 }}>{trip.icon}</span>
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="h6" gutterBottom>{trip.name}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {getStatusIcon(state.status)}
                            <Chip 
                              label={(state.status || 'ERROR').toUpperCase()} 
                              color={getChipColor(state.status)} 
                              size="small" 
                              sx={{ ml: 1 }} 
                            />
                          </Box>
                        </Box>
                        <IconButton 
                          onClick={() => handleTripSelect(state.tripId)}
                          sx={{ color: isSelected ? 'primary.main' : 'action.active' }}
                        >
                          <DirectionsIcon />
                        </IconButton>
                      </Box>
                      {state.alerts?.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          {state.alerts.map((alert, j) => (
                            <Chip key={`alert-${j}-${alert}`} label={alert} color="warning" size="small" sx={{ mr: 1, mb: 1 }} />
                          ))}
                        </Box>
                      )}
                      <LinearProgress 
                        variant="determinate" 
                        value={state.progress || 0} 
                        sx={{ mb: 2, borderRadius: 10 }} 
                        color={state.progress > 80 ? 'success' : 'primary'}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="body2" color="textSecondary">
                          {(state.progress || 0).toFixed(1)}%
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {(state.speed || 0).toFixed(1)} km/h
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {state.totalEvents || 0} events
                        </Typography>
                      </Box>
                      <Accordion 
                        expanded={expandedTrip === state.tripId}
                        onChange={(event, isExpanded) => setExpandedTrip(isExpanded ? state.tripId : null)}
                        sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="subtitle2">Details & Recent Events</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 0 }}>
                          <List dense>
                            <ListItem key="current-position">
                              <ListItemIcon>
                                <LocationOnIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText
                                primary="Current Position"
                                secondary={state.position ? `${(state.position.lat || 0).toFixed(4)}, ${(state.position.lng || 0).toFixed(4)}` : 'N/A'}
                              />
                            </ListItem>
                            {state.events?.length > 0 ? (
                              state.events.map((e, j) => (
                                <ListItem key={`event-${j}-${e.timestamp || j}`} divider={j < state.events.length - 1}>
                                  <ListItemIcon>
                                    <DirectionsIcon fontSize="small" />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={e.event_type?.replace(/_/g, ' ') || 'Unknown'}
                                    secondary={e.timestamp ? moment(e.timestamp).format('HH:mm:ss') : 'N/A'}
                                  />
                                </ListItem>
                              ))
                            ) : (
                              <ListItem key="no-events">
                                <ListItemText primary="No events yet" />
                              </ListItem>
                            )}
                          </List>
                        </AccordionDetails>
                      </Accordion>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
          {tripStates.length === 0 && (
            <Alert severity="info" sx={{ mt: 3 }}>
              No trips loaded – check data files in src/data/.
            </Alert>
          )}
        </Container>
      </div>
    </ThemeProvider>
  );
}

export default App;