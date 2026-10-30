type WorkspaceEnv={GOOGLE_LOGIN_CLIENT_ID?:string;DASHBOARD_WORKSPACE?:string;DASHBOARD_ALLOWED_EMAILS?:string};
type Identity={userId:string;email:string};

// Preserve the verified login identity; share data only for the configured team.
export function dashboardWorkspace(identity:Identity,env:WorkspaceEnv){
 if(!env.GOOGLE_LOGIN_CLIENT_ID||!env.DASHBOARD_WORKSPACE)return identity.userId;
 const allowed=(env.DASHBOARD_ALLOWED_EMAILS||'').split(',').map(value=>value.trim().toLowerCase());
 if(!identity.userId.startsWith('google:')||!allowed.includes(identity.email.toLowerCase()))throw Error('Akun ini tidak memiliki akses ke dashboard BaliEasy.');
 if(!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(env.DASHBOARD_WORKSPACE))throw Error('Workspace dashboard belum diatur.');
 return 'workspace:'+env.DASHBOARD_WORKSPACE;
}

export function shouldAutoSync(locations:{synced?:string}[],now=Date.now()){
 return !locations.length||locations.some(location=>!location.synced||!Number.isFinite(Date.parse(location.synced))||now-Date.parse(location.synced)>=15*60*1000);
}
