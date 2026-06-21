import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentRef } from '@angular/core';
import { of } from 'rxjs';

import { Blog } from './blog';
import { TrpcClient } from '../../trpc-client';

describe('Blog', () => {
  let component: Blog;
  let componentRef: ComponentRef<Blog>;
  let fixture: ComponentFixture<Blog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Blog],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: TrpcClient,
          useValue: {
            post: {
              getPosts: {
                query: () => of([{ id: 1, title: 'Test Post', blogId: 1 }]),
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Blog);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('blogId', '1');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
