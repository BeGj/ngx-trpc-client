import { Component, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TrpcClient } from '../../trpc-client';

@Component({
  selector: 'app-blog',
  imports: [],
  templateUrl: './blog.html',
  styleUrl: './blog.css',
})
export class Blog {
  private trpc = inject(TrpcClient);

  blogId = input.required<number, string>({ transform: Number });

  postResource = rxResource({
    stream: ({ params }) =>
      this.trpc.post.getPosts.query({
        blogId: params.blogId,
      }),
    params: () => ({ blogId: this.blogId() }),
  });
}
