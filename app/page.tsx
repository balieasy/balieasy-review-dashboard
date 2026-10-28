import Dashboard from './dashboard';
import {env} from 'cloudflare:workers';
export default function Home(){return <Dashboard showSignOut={!!env.GOOGLE_LOGIN_CLIENT_ID}/>;}
