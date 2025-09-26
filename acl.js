import {readFileSync} from "fs"

const accessList = JSON.parse(
  readFileSync(new URL("./access-list.json", import.meta.url))
)

// access control list middleware
export default function acl(request, response, next){

  const userRoles = ["*"]
  const sessionRole = request.session?.user?.role
  if(sessionRole){
    userRoles.push(sessionRole)
  }
  //console.log('userRoles', userRoles)

  for(const route of accessList){
    //console.log('route', route)
    //console.log('current route', request.path) // NOT request.route.path DUH!

    if(route.url === request.path){
      //console.log('route.url', route.url)
      for(const access of route.accesses){
        // matching the intersection between two arrays
        if(userRoles.some(type => access.types.includes(type)) 
          && access.methods.includes(request.method)){
          console.log('match')
          // call next now that we have access rights
          return next()
        }
      }
    }

  }

  return response.status(403).json({message:"Access forbidden"})

}