import { Route, Switch, Redirect } from "wouter";
import { Provider } from "./components/provider";
import { AgentFeedback } from "@runablehq/website-runtime";
import { useAuth } from "./lib/auth";

import Layout from "./components/layout";
import SignIn from "./pages/sign-in";
import SignUp from "./pages/sign-up";
import Onboarding from "./pages/onboarding";
import Pending from "./pages/pending";
import Dashboard from "./pages/dashboard";
import Listings from "./pages/listings";
import ListingDetail from "./pages/listing-detail";
import Submissions from "./pages/submissions";
import Earnings from "./pages/earnings";
import Payments from "./pages/payments";
import Admin from "./pages/admin";
import Referrals from "./pages/referrals";
import Learning from "./pages/learning";
import Posts from "./pages/posts";
import Settings from "./pages/settings";

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({
  component: Component,
  adminOnly = false,
}: {
  component: React.ComponentType;
  adminOnly?: boolean;
}) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Redirect to="/sign-in" />;

  if (user.isAdmin) return adminOnly ? <Component /> : <Layout><Component /></Layout>;

  if (adminOnly) return <Redirect to="/dashboard" />;

  if (user.applicationStatus === "incomplete") return <Redirect to="/onboarding" />;
  if (user.applicationStatus === "submitted") return <Redirect to="/pending" />;
  if (user.applicationStatus === "rejected") return <Redirect to="/pending" />;

  return <Layout><Component /></Layout>;
}

function GuestRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (user) return <Redirect to="/dashboard" />;
  return <Component />;
}

function App() {
  return (
    <Provider>
      <Switch>
        <Route path="/" component={() => <Redirect to="/sign-in" />} />
        <Route path="/sign-in" component={() => <GuestRoute component={SignIn} />} />
        <Route path="/sign-up" component={() => <GuestRoute component={SignUp} />} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/pending" component={Pending} />
        <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
        <Route path="/listings" component={() => <ProtectedRoute component={Listings} />} />
        <Route path="/listings/:id" component={() => <ProtectedRoute component={ListingDetail} />} />
        <Route path="/submissions" component={() => <ProtectedRoute component={Submissions} />} />
        <Route path="/earnings" component={() => <ProtectedRoute component={Earnings} />} />
        <Route path="/payments" component={() => <ProtectedRoute component={Payments} />} />
        <Route path="/marketplace" component={() => <ProtectedRoute component={Listings} />} />
        <Route path="/referrals" component={() => <ProtectedRoute component={Referrals} />} />
        <Route path="/learning" component={() => <ProtectedRoute component={Learning} />} />
        <Route path="/admin" component={() => <ProtectedRoute component={Admin} adminOnly />} />
        <Route path="/posts" component={() => <ProtectedRoute component={Posts} />} />
        <Route path="/admin/:tab" component={() => <ProtectedRoute component={Admin} adminOnly />} />
        <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
        <Route component={() => <Redirect to="/sign-in" />} />
      </Switch>
      {import.meta.env.DEV && <AgentFeedback />}
    </Provider>
  );
}

export default App;
